from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AlertRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    store_id: uuid.UUID | None
    alert_type: str
    threshold: float | None
    window_days: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CreateAlertRuleRequest(BaseModel):
    alert_type: str = Field(
        description="One of: margin_below | sync_failed | fulfillment_error | stock_below"
    )
    store_id: uuid.UUID | None = Field(
        default=None, description="Scope to a specific store; null = all stores."
    )
    threshold: float | None = Field(
        default=None,
        ge=0,
        le=100,
        description="For margin_below: fire when avg margin < this value (0–100).",
    )
    window_days: int = Field(default=7, ge=1, le=90)
    is_active: bool = Field(default=True)


class UpdateAlertRuleRequest(BaseModel):
    threshold: float | None = Field(default=None, ge=0, le=100)
    window_days: int | None = Field(default=None, ge=1, le=90)
    is_active: bool | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    rule_id: uuid.UUID | None
    notification_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseModel):
    count: int
