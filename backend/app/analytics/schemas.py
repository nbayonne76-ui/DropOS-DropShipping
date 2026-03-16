from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field


class DashboardSummary(BaseModel):
    tenant_id: uuid.UUID
    store_id: uuid.UUID | None = None
    from_date: date
    to_date: date

    total_orders: int = 0
    gross_revenue: int = Field(0, description="Total gross revenue in cents.")
    net_revenue: int = Field(0, description="Total net revenue in cents.")
    total_cost: int = Field(0, description="Sum of all cost layers in cents.")
    net_profit: int = Field(0, description="Net revenue minus total cost, in cents.")
    avg_profit_margin: Decimal | None = Field(
        None, description="Average profit margin across all orders (0-1)."
    )
    total_refunds: int = Field(0, description="Total refunded amount in cents.")
    refund_rate: Decimal | None = Field(
        None, description="refund_amount / gross_revenue (0-1)."
    )


class TrendPoint(BaseModel):
    period: str = Field(
        description="ISO date string representing the start of the period (day/week/month)."
    )
    orders: int = 0
    gross_revenue: int = 0
    net_revenue: int = 0
    net_profit: int = 0
    avg_margin: Decimal | None = None


class CostBreakdown(BaseModel):
    tenant_id: uuid.UUID
    store_id: uuid.UUID | None = None
    from_date: date
    to_date: date

    cogs: int = 0
    shipping_cost: int = 0
    platform_fee: int = 0
    payment_fee: int = 0
    chargeback_fee: int = 0
    refund_fee: int = 0
    fx_loss: int = 0
    import_duty: int = 0
    total: int = 0


class StoreComparison(BaseModel):
    store_id: uuid.UUID
    store_name: str
    shopify_domain: str
    orders: int = 0
    gross_revenue: int = 0
    net_revenue: int = 0
    net_profit: int = 0
    avg_margin: Decimal | None = None


class TopProduct(BaseModel):
    shopify_product_id: str | None
    title: str
    sku: str | None = None
    units_sold: int = 0
    gross_revenue: int = 0
    net_profit: int = 0


class TopOrder(BaseModel):
    order_id: uuid.UUID
    shopify_order_id: str
    order_number: str | None
    store_id: uuid.UUID
    ordered_at: datetime
    net_revenue: int
    net_profit: int
    profit_margin: Decimal | None
