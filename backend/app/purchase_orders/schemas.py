from __future__ import annotations

import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# ── Items ─────────────────────────────────────────────────────────────────────

class PurchaseOrderItemRequest(BaseModel):
    title: str = Field(max_length=512)
    sku: str | None = Field(default=None, max_length=200)
    shopify_variant_id: str | None = Field(default=None, max_length=64)
    quantity: int = Field(ge=1)
    unit_cost_cents: int = Field(ge=0)


class PurchaseOrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    po_id: uuid.UUID
    shopify_variant_id: str | None
    sku: str | None
    title: str
    quantity: int
    unit_cost_cents: int
    total_cents: int


# ── Purchase Orders ───────────────────────────────────────────────────────────

class CreatePurchaseOrderRequest(BaseModel):
    supplier_id: uuid.UUID
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    expected_delivery_date: date | None = None
    items: list[PurchaseOrderItemRequest] = Field(default_factory=list)


class UpdatePurchaseOrderRequest(BaseModel):
    reference: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    expected_delivery_date: date | None = None
    status: str | None = None  # valid transitions enforced in service


class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    supplier_id: uuid.UUID
    supplier_name: str
    reference: str | None
    status: str
    notes: str | None
    expected_delivery_date: date | None
    received_at: datetime | None
    items: list[PurchaseOrderItemResponse]
    total_cost_cents: int
    created_at: datetime
    updated_at: datetime
