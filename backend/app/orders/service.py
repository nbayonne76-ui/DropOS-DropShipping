from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ForbiddenError, NotFoundError
from app.common.pagination import Page, PageParams
from app.orders.cost_calculator import recalculate_order
from app.orders.models import Order, OrderLineItem
from app.orders.schemas import (
    OrderFilterParams,
    OrderResponse,
    UpdateOrderCostsRequest,
)


class OrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_orders(
        self,
        tenant_id: uuid.UUID,
        filters: OrderFilterParams,
        params: PageParams,
    ) -> Page[OrderResponse]:
        base_q = (
            select(Order)
            .where(Order.tenant_id == tenant_id)
            .where(Order.deleted_at.is_(None))
        )

        if filters.store_id:
            base_q = base_q.where(Order.store_id == filters.store_id)
        if filters.status:
            base_q = base_q.where(Order.status == filters.status)
        if filters.from_date:
            base_q = base_q.where(Order.ordered_at >= filters.from_date)
        if filters.to_date:
            base_q = base_q.where(Order.ordered_at <= filters.to_date)

        total = await self.db.scalar(
            select(func.count()).select_from(base_q.subquery())
        )

        rows = await self.db.scalars(
            base_q.options(selectinload(Order.line_items))
            .order_by(Order.ordered_at.desc())
            .offset(params.offset)
            .limit(params.limit)
        )
        items = [OrderResponse.model_validate(o) for o in rows.all()]
        return Page.create(items=items, total=total or 0, params=params)

    async def get_order(self, order_id: uuid.UUID, tenant_id: uuid.UUID) -> OrderResponse:
        order = await self._get_owned(order_id, tenant_id)
        return OrderResponse.model_validate(order)

    async def update_order_costs(
        self,
        order_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: UpdateOrderCostsRequest,
    ) -> OrderResponse:
        order = await self._get_owned(order_id, tenant_id)

        if data.cogs is not None:
            order.cogs = data.cogs
        if data.shipping_cost is not None:
            order.shipping_cost = data.shipping_cost
        if data.platform_fee is not None:
            order.platform_fee = data.platform_fee
        if data.payment_fee is not None:
            order.payment_fee = data.payment_fee
        if data.chargeback_fee is not None:
            order.chargeback_fee = data.chargeback_fee
        if data.refund_fee is not None:
            order.refund_fee = data.refund_fee
        if data.fx_loss is not None:
            order.fx_loss = data.fx_loss
        if data.import_duty is not None:
            order.import_duty = data.import_duty

        computed = recalculate_order(
            gross_revenue=order.gross_revenue,
            refund_amount=order.refund_amount,
            cogs=order.cogs,
            shipping=order.shipping_cost,
            platform_fee=order.platform_fee,
            payment_fee=order.payment_fee,
            chargeback_fee=order.chargeback_fee,
            refund_fee=order.refund_fee,
            fx_loss=order.fx_loss,
            import_duty=order.import_duty,
        )
        order.net_revenue = computed["net_revenue"]
        order.total_cost = computed["total_cost"]
        order.net_profit = computed["net_profit"]
        order.profit_margin = computed["profit_margin"]

        await self.db.flush()
        return OrderResponse.model_validate(order)

    async def ingest_from_shopify_payload(
        self,
        payload: dict,
        store_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> Order:
        """Upsert an order from a Shopify webhook or sync payload."""
        shopify_id = str(payload["id"])

        order = await self.db.scalar(
            select(Order)
            .where(Order.store_id == store_id)
            .where(Order.shopify_order_id == shopify_id)
        )

        gross_revenue = int(float(payload.get("total_price", "0")) * 100)
        refund_amount = int(
            sum(
                float(r.get("transactions", [{}])[0].get("amount", 0)) * 100
                if r.get("transactions")
                else 0
                for r in payload.get("refunds", [])
            )
        )

        if order is None:
            order = Order(
                tenant_id=tenant_id,
                store_id=store_id,
                shopify_order_id=shopify_id,
                order_number=payload.get("order_number"),
                status=payload.get("financial_status", "open"),
                ordered_at=datetime.fromisoformat(
                    payload["created_at"].replace("Z", "+00:00")
                ),
                currency=payload.get("currency", "USD"),
                gross_revenue=gross_revenue,
                refund_amount=refund_amount,
                customer_email=payload.get("email"),
                shipping_country=(
                    payload.get("shipping_address", {}).get("country_code")
                ),
                # Explicit Python-level defaults (DB defaults not applied until after flush)
                cogs=0, shipping_cost=0, platform_fee=0, payment_fee=0,
                chargeback_fee=0, refund_fee=0, fx_loss=0, import_duty=0,
                total_cost=0, net_profit=0, net_revenue=0,
            )
            self.db.add(order)
        else:
            order.status = payload.get("financial_status", order.status)
            order.gross_revenue = gross_revenue
            order.refund_amount = refund_amount

        computed = recalculate_order(
            gross_revenue=order.gross_revenue,
            refund_amount=order.refund_amount,
            cogs=order.cogs,
            shipping=order.shipping_cost,
            platform_fee=order.platform_fee,
            payment_fee=order.payment_fee,
            chargeback_fee=order.chargeback_fee,
            refund_fee=order.refund_fee,
            fx_loss=order.fx_loss,
            import_duty=order.import_duty,
        )
        order.net_revenue = computed["net_revenue"]
        order.total_cost = computed["total_cost"]
        order.net_profit = computed["net_profit"]
        order.profit_margin = computed["profit_margin"]

        await self.db.flush()

        # Upsert line items
        for item in payload.get("line_items", []):
            shopify_li_id = str(item["id"])
            li = await self.db.scalar(
                select(OrderLineItem)
                .where(OrderLineItem.order_id == order.id)
                .where(OrderLineItem.shopify_line_item_id == shopify_li_id)
            )
            if li is None:
                li = OrderLineItem(
                    order_id=order.id,
                    shopify_line_item_id=shopify_li_id,
                    shopify_product_id=str(item.get("product_id", "")),
                    shopify_variant_id=str(item.get("variant_id", "")),
                    title=item.get("title", ""),
                    sku=item.get("sku"),
                    quantity=item.get("quantity", 1),
                    unit_price=int(float(item.get("price", "0")) * 100),
                )
                self.db.add(li)

        await self.db.flush()
        return order

    async def export_csv(
        self,
        tenant_id: uuid.UUID,
        filters: OrderFilterParams,
    ) -> str:
        """Return all matching orders as a CSV string."""
        params = PageParams(page=1, page_size=10_000)
        page = await self.list_orders(tenant_id, filters, params)

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "id", "shopify_order_id", "order_number", "status",
                "ordered_at", "currency", "gross_revenue", "refund_amount",
                "net_revenue", "cogs", "shipping_cost", "platform_fee",
                "payment_fee", "chargeback_fee", "refund_fee", "fx_loss",
                "import_duty", "total_cost", "net_profit", "profit_margin",
            ],
        )
        writer.writeheader()
        for o in page.items:
            writer.writerow({
                "id": str(o.id),
                "shopify_order_id": o.shopify_order_id,
                "order_number": o.order_number,
                "status": o.status,
                "ordered_at": o.ordered_at.isoformat(),
                "currency": o.currency,
                "gross_revenue": o.gross_revenue,
                "refund_amount": o.refund_amount,
                "net_revenue": o.net_revenue,
                "cogs": o.cogs,
                "shipping_cost": o.shipping_cost,
                "platform_fee": o.platform_fee,
                "payment_fee": o.payment_fee,
                "chargeback_fee": o.chargeback_fee,
                "refund_fee": o.refund_fee,
                "fx_loss": o.fx_loss,
                "import_duty": o.import_duty,
                "total_cost": o.total_cost,
                "net_profit": o.net_profit,
                "profit_margin": str(o.profit_margin) if o.profit_margin is not None else "",
            })
        return output.getvalue()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, order_id: uuid.UUID, tenant_id: uuid.UUID) -> Order:
        order = await self.db.scalar(
            select(Order)
            .where(Order.id == order_id)
            .where(Order.deleted_at.is_(None))
            .options(selectinload(Order.line_items))
        )
        if not order:
            raise NotFoundError("Order", order_id)
        if order.tenant_id != tenant_id:
            raise ForbiddenError()
        return order
