from __future__ import annotations

import csv
import io
import uuid
from datetime import date, datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from sqlalchemy import cast, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.analytics.schemas import (
    CostBreakdown,
    CustomerAnalytics,
    DashboardSummary,
    StoreComparison,
    TopOrder,
    TopProduct,
    TrendPoint,
)
from app.orders.models import Order, OrderLineItem
from app.stores.models import Store

Granularity = Literal["day", "week", "month"]


class AnalyticsService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_summary(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
    ) -> DashboardSummary:
        q = self._base_order_query(tenant_id, store_id, from_date, to_date)

        row = await self.db.execute(
            select(
                func.count(Order.id).label("total_orders"),
                func.coalesce(func.sum(Order.gross_revenue), 0).label("gross_revenue"),
                func.coalesce(func.sum(Order.net_revenue), 0).label("net_revenue"),
                func.coalesce(func.sum(Order.total_cost), 0).label("total_cost"),
                func.coalesce(func.sum(Order.net_profit), 0).label("net_profit"),
                func.coalesce(func.sum(Order.refund_amount), 0).label("total_refunds"),
                func.avg(Order.profit_margin).label("avg_margin"),
            ).select_from(q.subquery())
        )
        r = row.one()

        gross = int(r.gross_revenue)
        avg_margin = (
            Decimal(str(r.avg_margin)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
            if r.avg_margin is not None
            else None
        )
        refund_rate = (
            (Decimal(r.total_refunds) / Decimal(gross)).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
            if gross > 0
            else None
        )

        return DashboardSummary(
            tenant_id=tenant_id,
            store_id=store_id,
            from_date=from_date,
            to_date=to_date,
            total_orders=r.total_orders or 0,
            gross_revenue=gross,
            net_revenue=int(r.net_revenue),
            total_cost=int(r.total_cost),
            net_profit=int(r.net_profit),
            avg_profit_margin=avg_margin,
            total_refunds=int(r.total_refunds),
            refund_rate=refund_rate,
        )

    async def get_trends(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
        granularity: Granularity = "day",
    ) -> list[TrendPoint]:
        trunc_map = {"day": "day", "week": "week", "month": "month"}
        trunc = trunc_map[granularity]

        q = self._base_order_query(tenant_id, store_id, from_date, to_date)
        subq = q.subquery()

        stmt = (
            select(
                func.date_trunc(trunc, subq.c.ordered_at).label("period"),
                func.count(subq.c.id).label("orders"),
                func.coalesce(func.sum(subq.c.gross_revenue), 0).label("gross_revenue"),
                func.coalesce(func.sum(subq.c.net_revenue), 0).label("net_revenue"),
                func.coalesce(func.sum(subq.c.net_profit), 0).label("net_profit"),
                func.avg(subq.c.profit_margin).label("avg_margin"),
            )
            .group_by(text("period"))
            .order_by(text("period"))
        )

        result = await self.db.execute(stmt)
        points = []
        for row in result.all():
            avg_m = (
                Decimal(str(row.avg_margin)).quantize(
                    Decimal("0.0001"), rounding=ROUND_HALF_UP
                )
                if row.avg_margin is not None
                else None
            )
            points.append(
                TrendPoint(
                    period=row.period.date().isoformat(),
                    orders=row.orders or 0,
                    gross_revenue=int(row.gross_revenue),
                    net_revenue=int(row.net_revenue),
                    net_profit=int(row.net_profit),
                    avg_margin=avg_m,
                )
            )
        return points

    async def get_cost_breakdown(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
    ) -> CostBreakdown:
        q = self._base_order_query(tenant_id, store_id, from_date, to_date)
        subq = q.subquery()

        stmt = select(
            func.coalesce(func.sum(subq.c.cogs), 0).label("cogs"),
            func.coalesce(func.sum(subq.c.shipping_cost), 0).label("shipping_cost"),
            func.coalesce(func.sum(subq.c.platform_fee), 0).label("platform_fee"),
            func.coalesce(func.sum(subq.c.payment_fee), 0).label("payment_fee"),
            func.coalesce(func.sum(subq.c.chargeback_fee), 0).label("chargeback_fee"),
            func.coalesce(func.sum(subq.c.refund_fee), 0).label("refund_fee"),
            func.coalesce(func.sum(subq.c.fx_loss), 0).label("fx_loss"),
            func.coalesce(func.sum(subq.c.import_duty), 0).label("import_duty"),
            func.coalesce(func.sum(subq.c.total_cost), 0).label("total"),
        )

        row = (await self.db.execute(stmt)).one()
        return CostBreakdown(
            tenant_id=tenant_id,
            store_id=store_id,
            from_date=from_date,
            to_date=to_date,
            cogs=int(row.cogs),
            shipping_cost=int(row.shipping_cost),
            platform_fee=int(row.platform_fee),
            payment_fee=int(row.payment_fee),
            chargeback_fee=int(row.chargeback_fee),
            refund_fee=int(row.refund_fee),
            fx_loss=int(row.fx_loss),
            import_duty=int(row.import_duty),
            total=int(row.total),
        )

    async def get_store_comparison(
        self,
        tenant_id: uuid.UUID,
        from_date: date,
        to_date: date,
    ) -> list[StoreComparison]:
        from_dt = datetime.combine(from_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        to_dt = datetime.combine(to_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        stmt = (
            select(
                Store.id.label("store_id"),
                Store.name.label("store_name"),
                Store.shopify_domain,
                func.count(Order.id).label("orders"),
                func.coalesce(func.sum(Order.gross_revenue), 0).label("gross_revenue"),
                func.coalesce(func.sum(Order.net_revenue), 0).label("net_revenue"),
                func.coalesce(func.sum(Order.net_profit), 0).label("net_profit"),
                func.avg(Order.profit_margin).label("avg_margin"),
            )
            .join(Order, Order.store_id == Store.id, isouter=True)
            .where(Store.tenant_id == tenant_id)
            .where(Store.deleted_at.is_(None))
            .where(
                (Order.ordered_at >= from_dt) | Order.ordered_at.is_(None)
            )
            .where(
                (Order.ordered_at <= to_dt) | Order.ordered_at.is_(None)
            )
            .where(Order.deleted_at.is_(None))
            .group_by(Store.id, Store.name, Store.shopify_domain)
            .order_by(func.coalesce(func.sum(Order.net_profit), 0).desc())
        )

        result = await self.db.execute(stmt)
        comparisons = []
        for row in result.all():
            avg_m = (
                Decimal(str(row.avg_margin)).quantize(
                    Decimal("0.0001"), rounding=ROUND_HALF_UP
                )
                if row.avg_margin is not None
                else None
            )
            comparisons.append(
                StoreComparison(
                    store_id=row.store_id,
                    store_name=row.store_name,
                    shopify_domain=row.shopify_domain,
                    orders=row.orders or 0,
                    gross_revenue=int(row.gross_revenue),
                    net_revenue=int(row.net_revenue),
                    net_profit=int(row.net_profit),
                    avg_margin=avg_m,
                )
            )
        return comparisons

    async def get_top_products(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
        limit: int = 10,
    ) -> list[TopProduct]:
        from_dt = datetime.combine(from_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        to_dt = datetime.combine(to_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        stmt = (
            select(
                OrderLineItem.shopify_product_id,
                OrderLineItem.title,
                OrderLineItem.sku,
                func.sum(OrderLineItem.quantity).label("units_sold"),
                func.sum(
                    OrderLineItem.unit_price * OrderLineItem.quantity
                ).label("gross_revenue"),
                func.sum(
                    (OrderLineItem.unit_price - OrderLineItem.unit_cogs)
                    * OrderLineItem.quantity
                ).label("net_profit"),
            )
            .join(Order, Order.id == OrderLineItem.order_id)
            .where(Order.tenant_id == tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.ordered_at >= from_dt)
            .where(Order.ordered_at <= to_dt)
        )

        if store_id:
            stmt = stmt.where(Order.store_id == store_id)

        stmt = (
            stmt.group_by(
                OrderLineItem.shopify_product_id,
                OrderLineItem.title,
                OrderLineItem.sku,
            )
            .order_by(func.sum(
                (OrderLineItem.unit_price - OrderLineItem.unit_cogs)
                * OrderLineItem.quantity
            ).desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return [
            TopProduct(
                shopify_product_id=row.shopify_product_id,
                title=row.title,
                sku=row.sku,
                units_sold=int(row.units_sold or 0),
                gross_revenue=int(row.gross_revenue or 0),
                net_profit=int(row.net_profit or 0),
            )
            for row in result.all()
        ]

    async def get_top_orders(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
        limit: int = 10,
    ) -> list[TopOrder]:
        q = self._base_order_query(tenant_id, store_id, from_date, to_date)
        stmt = (
            q.order_by(Order.net_profit.desc())
            .limit(limit)
        )
        result = await self.db.scalars(stmt)
        return [
            TopOrder(
                order_id=o.id,
                shopify_order_id=o.shopify_order_id,
                order_number=o.order_number,
                store_id=o.store_id,
                ordered_at=o.ordered_at,
                net_revenue=o.net_revenue,
                net_profit=o.net_profit,
                profit_margin=o.profit_margin,
            )
            for o in result.all()
        ]

    async def export_summary_csv(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
        granularity: Granularity = "day",
    ) -> str:
        """Return a two-section CSV: summary KPIs then trend rows."""
        summary = await self.get_summary(tenant_id, store_id, from_date, to_date)
        trends = await self.get_trends(tenant_id, store_id, from_date, to_date, granularity)

        output = io.StringIO()

        # ── Section 1: summary ────────────────────────────────────────────────
        output.write("# Summary\n")
        summary_writer = csv.DictWriter(
            output,
            fieldnames=[
                "from_date", "to_date", "total_orders",
                "gross_revenue", "net_revenue", "total_cost",
                "net_profit", "avg_profit_margin", "total_refunds", "refund_rate",
            ],
        )
        summary_writer.writeheader()
        summary_writer.writerow({
            "from_date": str(summary.from_date),
            "to_date": str(summary.to_date),
            "total_orders": summary.total_orders,
            "gross_revenue": summary.gross_revenue,
            "net_revenue": summary.net_revenue,
            "total_cost": summary.total_cost,
            "net_profit": summary.net_profit,
            "avg_profit_margin": str(summary.avg_profit_margin) if summary.avg_profit_margin is not None else "",
            "total_refunds": summary.total_refunds,
            "refund_rate": str(summary.refund_rate) if summary.refund_rate is not None else "",
        })

        # ── Section 2: trends ─────────────────────────────────────────────────
        output.write("\n# Trends\n")
        trend_writer = csv.DictWriter(
            output,
            fieldnames=["period", "orders", "gross_revenue", "net_revenue", "net_profit", "avg_margin"],
        )
        trend_writer.writeheader()
        for t in trends:
            trend_writer.writerow({
                "period": t.period,
                "orders": t.orders,
                "gross_revenue": t.gross_revenue,
                "net_revenue": t.net_revenue,
                "net_profit": t.net_profit,
                "avg_margin": str(t.avg_margin) if t.avg_margin is not None else "",
            })

        return output.getvalue()

    async def get_customers(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
        limit: int = 50,
    ) -> list[CustomerAnalytics]:
        """Top customers ranked by total gross revenue, with LTV metrics."""
        from_dt = datetime.combine(from_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        to_dt = datetime.combine(to_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        stmt = (
            select(
                Order.customer_email,
                func.count(Order.id).label("order_count"),
                func.coalesce(func.sum(Order.gross_revenue), 0).label("total_gross_revenue"),
                func.coalesce(func.sum(Order.net_profit), 0).label("total_net_profit"),
                func.coalesce(func.avg(Order.gross_revenue), 0).label("avg_order_value"),
                func.coalesce(func.sum(Order.refund_amount), 0).label("total_refunds"),
                func.max(Order.ordered_at).label("last_ordered_at"),
            )
            .where(Order.tenant_id == tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.ordered_at >= from_dt)
            .where(Order.ordered_at <= to_dt)
            .where(Order.customer_email.isnot(None))
        )
        if store_id:
            stmt = stmt.where(Order.store_id == store_id)

        stmt = (
            stmt.group_by(Order.customer_email)
            .order_by(func.coalesce(func.sum(Order.gross_revenue), 0).desc())
            .limit(limit)
        )

        result = await self.db.execute(stmt)
        return [
            CustomerAnalytics(
                customer_email=row.customer_email,
                order_count=row.order_count or 0,
                total_gross_revenue=int(row.total_gross_revenue),
                total_net_profit=int(row.total_net_profit),
                avg_order_value=int(row.avg_order_value),
                total_refunds=int(row.total_refunds),
                last_ordered_at=row.last_ordered_at,
            )
            for row in result.all()
        ]

    async def export_orders_csv(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
    ) -> str:
        """Stream all orders in the period as CSV."""
        q = self._base_order_query(tenant_id, store_id, from_date, to_date)
        orders = await self.db.scalars(q.order_by(Order.ordered_at.desc()))

        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            fieldnames=[
                "order_number", "ordered_at", "status", "fulfillment_status",
                "customer_email", "shipping_country", "currency",
                "gross_revenue", "refund_amount", "net_revenue",
                "cogs", "shipping_cost", "platform_fee", "payment_fee",
                "chargeback_fee", "refund_fee", "fx_loss", "import_duty",
                "total_cost", "net_profit", "profit_margin",
                "tracking_number", "tracking_company",
            ],
        )
        writer.writeheader()
        for o in orders.all():
            writer.writerow({
                "order_number": o.order_number,
                "ordered_at": o.ordered_at.isoformat() if o.ordered_at else "",
                "status": o.status,
                "fulfillment_status": o.fulfillment_status,
                "customer_email": o.customer_email or "",
                "shipping_country": o.shipping_country or "",
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
                "tracking_number": o.tracking_number or "",
                "tracking_company": o.tracking_company or "",
            })
        return output.getvalue()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _base_order_query(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        from_date: date,
        to_date: date,
    ):
        from_dt = datetime.combine(from_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        to_dt = datetime.combine(to_date, datetime.max.time()).replace(tzinfo=timezone.utc)

        q = (
            select(Order)
            .where(Order.tenant_id == tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.ordered_at >= from_dt)
            .where(Order.ordered_at <= to_dt)
        )
        if store_id:
            q = q.where(Order.store_id == store_id)
        return q
