"""
ARQ background job definitions.

Each function receives a context dict (ctx) as its first argument.
ctx["redis"] is the ARQ Redis pool; other keys can be added via WorkerSettings.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.stores.models import Store

logger = logging.getLogger("dropos.worker")

AUTO_FULFILL_TOPICS = frozenset({"orders/paid"})


async def evaluate_alerts_job(ctx: dict) -> dict:
    """
    Cron job: evaluate all active alert rules and create notifications for
    any that have fired.  Runs every 15 minutes via WorkerSettings.cron_jobs.
    """
    from app.notifications.service import NotificationService

    async with AsyncSessionLocal() as db:
        try:
            svc = NotificationService(db)
            created = await svc.evaluate_all_rules()
            await db.commit()
            logger.info("evaluate_alerts_job: created %d notification(s)", created)
            return {"notifications_created": created}
        except Exception:
            await db.rollback()
            raise


async def auto_fulfill_job(
    ctx: dict,
    order_id: str,
    store_id: str,
    tenant_id: str,
    tracking_number: str | None = None,
    tracking_company: str | None = None,
) -> dict:
    """
    Background job: fulfill a Shopify order after payment.
    Triggered automatically when an orders/paid webhook is received.
    """
    from app.orders.models import Order
    from app.stores.models import Store
    from app.stores.shopify_fulfillment import fulfill_shopify_order
    from datetime import datetime, timezone

    _order_id = uuid.UUID(order_id)
    _store_id = uuid.UUID(store_id)
    _tenant_id = uuid.UUID(tenant_id)

    async with AsyncSessionLocal() as db:
        try:
            order = await db.scalar(
                select(Order)
                .where(Order.id == _order_id)
                .where(Order.deleted_at.is_(None))
            )
            if not order:
                raise ValueError(f"Order {order_id} not found.")
            if order.fulfillment_status == "fulfilled":
                logger.info("auto_fulfill_job: order %s already fulfilled — skipping", order_id)
                return {"skipped": True, "reason": "already_fulfilled"}

            store = await db.scalar(
                select(Store).where(Store.id == _store_id)
            )
            if not store or not store.shopify_access_token_encrypted:
                raise ValueError(f"Store {store_id} not found or missing token.")

            logger.info("auto_fulfill_job start order_id=%s", order_id)

            result = await fulfill_shopify_order(
                shop_domain=store.shopify_domain,
                encrypted_access_token=store.shopify_access_token_encrypted,
                shopify_order_id=order.shopify_order_id,
                tracking_number=tracking_number,
                tracking_company=tracking_company,
                notify_customer=True,
            )

            order.fulfillment_status = "fulfilled"
            order.shopify_fulfillment_id = result.shopify_fulfillment_id
            order.tracking_number = result.tracking_number
            order.tracking_company = result.tracking_company
            order.fulfilled_at = datetime.now(tz=timezone.utc)
            order.status = "fulfilled"

            await db.commit()
            logger.info("auto_fulfill_job done order_id=%s fulfillment_id=%s", order_id, result.shopify_fulfillment_id)
            return {"fulfillment_id": result.shopify_fulfillment_id, "status": result.status}
        except Exception:
            await db.rollback()
            raise


async def score_suppliers_job(ctx: dict) -> dict:
    """
    Weekly cron job: compute a SupplierPerformanceSnapshot for every active supplier
    based on orders from the past 30 days that contain their linked products.
    """
    from datetime import timedelta

    from sqlalchemy import func

    from app.orders.models import Order, OrderLineItem
    from app.suppliers.models import ProductSupplierLink, Supplier, SupplierPerformanceSnapshot

    period_end = datetime.now(tz=timezone.utc)
    period_start = period_end - timedelta(days=30)
    created = 0

    async with AsyncSessionLocal() as db:
        try:
            suppliers = await db.scalars(
                select(Supplier).where(Supplier.deleted_at.is_(None))
            )
            for supplier in suppliers.all():
                try:
                    # Get all shopify_product_ids linked to this supplier
                    links = await db.scalars(
                        select(ProductSupplierLink).where(
                            ProductSupplierLink.supplier_id == supplier.id
                        )
                    )
                    product_ids = {lnk.shopify_product_id for lnk in links.all()}
                    if not product_ids:
                        continue

                    # Get orders within the window that contain those products
                    order_id_subq = (
                        select(OrderLineItem.order_id)
                        .where(OrderLineItem.shopify_product_id.in_(product_ids))
                        .distinct()
                        .scalar_subquery()
                    )
                    orders = await db.scalars(
                        select(Order)
                        .where(Order.tenant_id == supplier.tenant_id)
                        .where(Order.deleted_at.is_(None))
                        .where(Order.ordered_at >= period_start)
                        .where(Order.id.in_(order_id_subq))
                    )
                    orders_list = list(orders.all())
                    total_orders = len(orders_list)
                    if total_orders == 0:
                        continue

                    # Compute metrics
                    refunded = sum(1 for o in orders_list if o.status == "refunded")
                    defect_rate = refunded / total_orders

                    fulfilled = [o for o in orders_list if o.fulfilled_at is not None]
                    lead_times = [
                        (o.fulfilled_at - o.ordered_at).total_seconds() / 86400
                        for o in fulfilled
                        if o.fulfilled_at and o.ordered_at
                    ]
                    avg_lead = sum(lead_times) / len(lead_times) if lead_times else None
                    # On time = fulfilled within 7 days
                    on_time = sum(1 for lt in lead_times if lt <= 7)

                    # Total COGS for matching line items
                    total_cogs_result = await db.scalar(
                        select(func.sum(OrderLineItem.unit_cogs * OrderLineItem.quantity))
                        .join(Order, Order.id == OrderLineItem.order_id)
                        .where(Order.tenant_id == supplier.tenant_id)
                        .where(Order.deleted_at.is_(None))
                        .where(Order.ordered_at >= period_start)
                        .where(OrderLineItem.shopify_product_id.in_(product_ids))
                    )
                    total_cogs_cents = int(total_cogs_result or 0)

                    snapshot = SupplierPerformanceSnapshot(
                        supplier_id=supplier.id,
                        period_start=period_start,
                        period_end=period_end,
                        total_orders=total_orders,
                        on_time_deliveries=on_time,
                        defect_rate=defect_rate,
                        avg_lead_time_days=avg_lead,
                        total_cogs_cents=total_cogs_cents,
                    )
                    db.add(snapshot)
                    created += 1
                except Exception:
                    logger.exception("score_suppliers_job: error scoring supplier %s", supplier.id)

            await db.commit()
            logger.info("score_suppliers_job: created %d snapshots", created)
            return {"snapshots_created": created}
        except Exception:
            await db.rollback()
            raise


async def sync_store_job(
    ctx: dict,
    store_id: str,
    tenant_id: str,
    full_sync: bool = False,
) -> dict:
    """
    Pull orders from Shopify and upsert them into the DB.

    Replaces the previous synchronous in-request call so that large syncs
    don't block the HTTP server or timeout the client.
    """
    from app.stores.shopify_sync import sync_store_orders, sync_store_products

    _store_id = uuid.UUID(store_id)
    _tenant_id = uuid.UUID(tenant_id)

    async with AsyncSessionLocal() as db:
        try:
            store = await db.scalar(
                select(Store)
                .where(Store.id == _store_id)
                .where(Store.deleted_at.is_(None))
            )
            if not store:
                raise ValueError(f"Store {store_id} not found or has been deleted.")
            if store.tenant_id != _tenant_id:
                raise PermissionError(f"Tenant {tenant_id} does not own store {store_id}.")

            logger.info(
                "sync_store_job start store_id=%s tenant_id=%s full_sync=%s",
                store_id, tenant_id, full_sync,
            )

            # Sync products first so inventory is up-to-date before alert evaluation
            products_result = await sync_store_products(
                db=db,
                store=store,
                tenant_id=_tenant_id,
            )

            orders_result = await sync_store_orders(
                db=db,
                store=store,
                tenant_id=_tenant_id,
                full_sync=full_sync,
            )
            await db.commit()

            result = {**orders_result, "products_upserted": products_result.get("upserted", 0)}
            logger.info(
                "sync_store_job done store_id=%s orders_fetched=%s orders_upserted=%s "
                "products_upserted=%s pages=%s",
                store_id,
                result.get("fetched", 0),
                result.get("upserted", 0),
                result.get("products_upserted", 0),
                result.get("pages", 0),
            )
            return result
        except Exception:
            await db.rollback()
            raise
