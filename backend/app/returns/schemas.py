from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.returns.models import RETURN_REASONS, RETURN_STATUSES


class ReturnItemRequest(BaseModel):
    order_line_item_id: uuid.UUID | None = None
    sku: str | None = None
    title: str
    quantity: int = Field(1, ge=1)


class CreateReturnRequest(BaseModel):
    order_id: uuid.UUID
    reason: str = Field(..., description=f"One of: {', '.join(RETURN_REASONS)}")
    notes: str | None = None
    items: list[ReturnItemRequest] = Field(..., min_length=1)


class UpdateReturnRequest(BaseModel):
    status: str | None = Field(None, description=f"One of: {', '.join(RETURN_STATUSES)}")
    resolution_notes: str | None = None
    refund_amount_cents: int | None = Field(None, ge=0)


class ReturnItemResponse(BaseModel):
    id: uuid.UUID
    return_request_id: uuid.UUID
    order_line_item_id: uuid.UUID | None
    sku: str | None
    title: str
    quantity: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReturnRequestResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    order_id: uuid.UUID
    status: str
    reason: str
    notes: str | None
    resolution_notes: str | None
    refund_amount_cents: int
    resolved_at: datetime | None
    items: list[ReturnItemResponse]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
