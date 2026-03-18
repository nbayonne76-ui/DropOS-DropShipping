from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProductVariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    shopify_variant_id: str
    title: str
    sku: str | None
    price_cents: int
    compare_at_price_cents: int | None
    weight_grams: int | None
    inventory_quantity: int
    requires_shipping: bool


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    store_id: uuid.UUID
    shopify_product_id: str
    title: str
    vendor: str | None
    product_type: str | None
    status: str
    hs_code: str | None
    origin_country: str | None
    created_at: datetime
    updated_at: datetime
    variants: list[ProductVariantResponse] = []


class UpdateProductRequest(BaseModel):
    """Fields that merchants can update manually (not synced from Shopify)."""

    hs_code: str | None = Field(
        default=None,
        max_length=20,
        description="Harmonized System code for landed cost calculation.",
    )
    origin_country: str | None = Field(
        default=None,
        max_length=2,
        description="ISO 3166-1 alpha-2 country of manufacture.",
    )


class BulkCogsImportResult(BaseModel):
    """Result of a bulk COGS import from CSV."""

    updated: int
    """Number of order line items whose unit_cogs was updated."""
    orders_recalculated: int
    """Number of parent orders that were recalculated."""
    not_found_skus: list[str]
    """SKUs present in the CSV that matched no line items for this tenant."""


class ProductLandedCostResponse(BaseModel):
    product_id: uuid.UUID
    shopify_product_id: str
    hs_code: str
    origin_country: str
    destination_country: str
    value_cents: int
    duty_rate: float
    duty_cents: int
    total_landed_cents: int
    cached: bool
