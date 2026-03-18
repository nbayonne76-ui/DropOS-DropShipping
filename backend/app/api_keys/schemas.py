from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ApiKeyResponse(BaseModel):
    """Returned for list / after creation (without the raw key)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    prefix: str
    is_active: bool
    last_used_at: str | None
    created_at: datetime


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Returned only once at creation — includes the raw key."""
    raw_key: str


class CreateApiKeyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100, description="Human-readable label for this key.")
