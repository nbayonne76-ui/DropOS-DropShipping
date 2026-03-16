from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class StoreBase(BaseModel):
    name: str = Field(max_length=200)
    shopify_domain: str = Field(
        max_length=255,
        examples=["mystore.myshopify.com"],
        description="The .myshopify.com domain of the store.",
    )
    currency: str = Field(default="USD", max_length=3, description="ISO 4217 currency code.")


class CreateStoreRequest(StoreBase):
    shopify_access_token: str = Field(
        description="Shopify OAuth access token. Stored encrypted.",
    )
    webhook_secret: str | None = Field(default=None)


class UpdateStoreRequest(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    currency: str | None = Field(default=None, max_length=3)
    webhook_secret: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)


class SyncStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store_id: uuid.UUID
    shopify_domain: str
    is_active: bool
    last_synced_at: datetime | None
    sync_cursor: str | None


class StoreResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    shopify_domain: str
    currency: str
    is_active: bool
    last_synced_at: datetime | None
    created_at: datetime
    updated_at: datetime
    # Access token is intentionally omitted from all responses
