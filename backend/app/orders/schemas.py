from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderLineItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    shopify_line_item_id: str
    shopify_product_id: str | None
    shopify_variant_id: str | None
    title: str
    sku: str | None
    quantity: int
    unit_price: int = Field(description="Unit selling price in cents.")
    unit_cogs: int = Field(description="Unit cost of goods sold in cents.")


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    store_id: uuid.UUID
    shopify_order_id: str
    order_number: str | None
    status: str
    ordered_at: datetime
    currency: str

    # Revenue
    gross_revenue: int = Field(description="Total revenue before refunds, in cents.")
    refund_amount: int = Field(description="Total refunded, in cents.")
    net_revenue: int = Field(description="gross_revenue - refund_amount, in cents.")

    # Cost layers
    cogs: int
    shipping_cost: int
    platform_fee: int
    payment_fee: int
    chargeback_fee: int
    refund_fee: int
    fx_loss: int
    import_duty: int

    # Computed
    total_cost: int
    net_profit: int
    profit_margin: Decimal | None = Field(
        description="Net profit / net revenue (0-1 range)."
    )

    customer_email: str | None
    shipping_country: str | None

    created_at: datetime
    updated_at: datetime

    line_items: list[OrderLineItemResponse] = []


class UpdateOrderCostsRequest(BaseModel):
    """Allows manual override of any cost layer."""

    cogs: int | None = Field(default=None, ge=0)
    shipping_cost: int | None = Field(default=None, ge=0)
    platform_fee: int | None = Field(default=None, ge=0)
    payment_fee: int | None = Field(default=None, ge=0)
    chargeback_fee: int | None = Field(default=None, ge=0)
    refund_fee: int | None = Field(default=None, ge=0)
    fx_loss: int | None = Field(default=None, ge=0)
    import_duty: int | None = Field(default=None, ge=0)


class OrderFilterParams:
    """FastAPI query-parameter dependency for order listing."""

    def __init__(
        self,
        store_id: uuid.UUID | None = None,
        status: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> None:
        self.store_id = store_id
        self.status = status
        self.from_date = from_date
        self.to_date = to_date
