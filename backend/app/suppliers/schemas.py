from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class SupplierBase(BaseModel):
    name: str = Field(max_length=255)
    contact_email: str | None = Field(default=None, max_length=320)
    contact_phone: str | None = Field(default=None, max_length=30)
    website: str | None = None
    country: str | None = Field(default=None, max_length=2)
    notes: str | None = None


class CreateSupplierRequest(SupplierBase):
    api_key: str | None = Field(
        default=None,
        description="Supplier API key (stored encrypted).",
    )
    api_secret: str | None = Field(
        default=None,
        description="Supplier API secret (stored encrypted).",
    )
    api_endpoint: str | None = None


class UpdateSupplierRequest(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    contact_email: str | None = None
    contact_phone: str | None = None
    website: str | None = None
    country: str | None = Field(default=None, max_length=2)
    notes: str | None = None
    api_key: str | None = None
    api_secret: str | None = None
    api_endpoint: str | None = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    contact_email: str | None
    contact_phone: str | None
    website: str | None
    country: str | None
    notes: str | None
    api_endpoint: str | None
    # api_key / api_secret are intentionally excluded
    created_at: datetime
    updated_at: datetime


class LinkProductRequest(BaseModel):
    shopify_product_id: str
    shopify_variant_id: str | None = None
    supplier_sku: str | None = None
    unit_cost_cents: int = Field(ge=0)
    lead_time_days: int | None = Field(default=None, ge=0)
    moq: int | None = Field(default=None, ge=1)


class ProductSupplierLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    supplier_id: uuid.UUID
    shopify_product_id: str
    shopify_variant_id: str | None
    supplier_sku: str | None
    unit_cost_cents: int
    lead_time_days: int | None
    moq: int | None


class SupplierPerformanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    supplier_id: uuid.UUID
    period_start: datetime
    period_end: datetime
    total_orders: int
    on_time_deliveries: int
    defect_rate: Decimal | None
    avg_lead_time_days: Decimal | None
    total_cogs_cents: int

    @property
    def on_time_rate(self) -> Decimal | None:
        if self.total_orders == 0:
            return None
        return Decimal(self.on_time_deliveries) / Decimal(self.total_orders)
