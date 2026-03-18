from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("dropos.webhooks")

# Mapping of Shopify webhook topics to handler coroutines.
# Each handler receives (payload: dict, store_id: UUID, db: AsyncSession).
_HANDLERS: dict = {}


def _register(topic: str):
    """Decorator to register a coroutine as the handler for a webhook topic."""
    def decorator(fn):
        _HANDLERS[topic] = fn
        return fn
    return decorator


@_register("orders/create")
async def handle_order_create(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from app.orders.service import OrderService
    from app.stores.models import Store

    store = await db.get(Store, store_id)
    if not store:
        logger.warning("handle_order_create: store %s not found", store_id)
        return

    service = OrderService(db)
    await service.ingest_from_shopify_payload(
        payload=payload,
        store_id=store_id,
        tenant_id=store.tenant_id,
    )
    logger.info("Ingested order %s for store %s", payload.get("id"), store_id)


@_register("orders/paid")
async def handle_order_paid(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    """Ingest the order then enqueue auto-fulfillment in the background."""
    from app.config import settings as app_settings
    from app.orders.service import OrderService
    from app.stores.models import Store
    from arq.connections import ArqRedis, RedisSettings, create_pool

    store = await db.get(Store, store_id)
    if not store:
        logger.warning("handle_order_paid: store %s not found", store_id)
        return

    service = OrderService(db)
    order = await service.ingest_from_shopify_payload(
        payload=payload,
        store_id=store_id,
        tenant_id=store.tenant_id,
    )
    logger.info("Ingested paid order %s for store %s", payload.get("id"), store_id)

    # Enqueue auto-fulfillment job
    redis: ArqRedis = await create_pool(
        RedisSettings.from_dsn(app_settings.REDIS_URL)
    )
    try:
        job = await redis.enqueue_job(
            "auto_fulfill_job",
            str(order.id),
            str(store_id),
            str(store.tenant_id),
        )
        logger.info(
            "Enqueued auto_fulfill_job for order %s job_id=%s",
            order.id,
            job.job_id if job else None,
        )
    finally:
        await redis.aclose()



@_register("orders/updated")
async def handle_order_updated(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    # Re-use the same upsert logic as create
    await handle_order_create(payload, store_id, db)


@_register("orders/cancelled")
async def handle_order_cancelled(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from sqlalchemy import select

    from app.orders.models import Order

    shopify_id = str(payload.get("id", ""))
    order = await db.scalar(
        select(Order)
        .where(Order.store_id == store_id)
        .where(Order.shopify_order_id == shopify_id)
    )
    if order:
        order.status = "cancelled"
        await db.flush()
        logger.info("Marked order %s as cancelled (store %s)", shopify_id, store_id)


@_register("orders/refunded")
async def handle_order_refunded(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    """Upsert the order (Shopify sends the full order) then persist each refund record."""
    from datetime import timezone
    from dateutil.parser import parse as parse_dt
    from sqlalchemy import select

    from app.orders.models import Order
    from app.orders.refund_models import Refund

    # 1. Upsert the order with updated totals
    await handle_order_create(payload, store_id, db)

    # 2. Resolve the order row
    shopify_order_id = str(payload.get("id", ""))
    order = await db.scalar(
        select(Order)
        .where(Order.store_id == store_id)
        .where(Order.shopify_order_id == shopify_order_id)
        .where(Order.deleted_at.is_(None))
    )
    if not order:
        return

    # 3. Upsert each refund from the payload
    for raw in payload.get("refunds", []):
        shopify_refund_id = str(raw.get("id", ""))
        if not shopify_refund_id:
            continue

        existing = await db.scalar(
            select(Refund).where(Refund.shopify_refund_id == shopify_refund_id)
        )
        if existing:
            continue  # Already recorded — idempotent

        # Sum the refunded line amounts (in cents × 100 since Shopify sends decimals)
        total_cents = 0
        for tx in raw.get("transactions", []):
            try:
                total_cents += int(float(tx.get("amount", "0")) * 100)
            except (ValueError, TypeError):
                pass

        refunded_at = None
        created_at_str = raw.get("created_at")
        if created_at_str:
            try:
                refunded_at = parse_dt(created_at_str)
            except Exception:
                pass

        refund = Refund(
            order_id=order.id,
            shopify_refund_id=shopify_refund_id,
            amount=total_cents,
            currency=order.currency,
            reason=raw.get("refund_line_items", [{}])[0].get("restock_type") if raw.get("refund_line_items") else None,
            note=raw.get("note"),
            refunded_at=refunded_at,
        )
        db.add(refund)

    # 4. Mark order status as refunded
    order.status = "refunded"
    await db.flush()
    logger.info("Processed refund(s) for order %s (store %s)", shopify_order_id, store_id)


@_register("app/uninstalled")
async def handle_app_uninstalled(
    _payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from app.stores.models import Store

    store = await db.get(Store, store_id)
    if store:
        store.is_active = False
        store.shopify_access_token_encrypted = None
        await db.flush()
        logger.warning(
            "App uninstalled from store %s — store deactivated and token cleared.",
            store_id,
        )


async def dispatch_webhook(
    topic: str,
    payload: dict,
    store_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Route an incoming webhook to the appropriate handler.

    Unknown topics are logged and silently ignored to allow Shopify to keep
    delivering without receiving retried errors.
    """
    handler = _HANDLERS.get(topic)
    if handler is None:
        logger.debug("No handler registered for topic '%s' — ignoring.", topic)
        return
    try:
        await handler(payload, store_id, db)
    except Exception as exc:
        logger.exception(
            "Webhook handler for topic '%s' raised an exception: %s", topic, exc
        )
        raise
