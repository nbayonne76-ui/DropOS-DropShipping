from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.common.security import encrypt
from app.stores.models import Store
from app.stores.schemas import (
    CreateStoreRequest,
    StoreResponse,
    SyncStatusResponse,
    UpdateStoreRequest,
)


class StoreService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_stores(self, tenant_id: uuid.UUID) -> list[StoreResponse]:
        result = await self.db.scalars(
            select(Store)
            .where(Store.tenant_id == tenant_id)
            .where(Store.deleted_at.is_(None))
            .order_by(Store.created_at.desc())
        )
        return [StoreResponse.model_validate(s) for s in result.all()]

    async def get_store(self, store_id: uuid.UUID, tenant_id: uuid.UUID) -> StoreResponse:
        store = await self._get_owned(store_id, tenant_id)
        return StoreResponse.model_validate(store)

    async def create_store(
        self, tenant_id: uuid.UUID, data: CreateStoreRequest
    ) -> StoreResponse:
        existing = await self.db.scalar(
            select(Store).where(Store.shopify_domain == data.shopify_domain)
        )
        if existing:
            raise ConflictError(
                f"A store with domain '{data.shopify_domain}' is already connected."
            )

        store = Store(
            tenant_id=tenant_id,
            name=data.name,
            shopify_domain=data.shopify_domain,
            currency=data.currency,
            shopify_access_token_encrypted=encrypt(data.shopify_access_token),
            webhook_secret=data.webhook_secret,
        )
        self.db.add(store)
        await self.db.flush()
        return StoreResponse.model_validate(store)

    async def update_store(
        self,
        store_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: UpdateStoreRequest,
    ) -> StoreResponse:
        store = await self._get_owned(store_id, tenant_id)
        if data.name is not None:
            store.name = data.name
        if data.currency is not None:
            store.currency = data.currency
        if data.webhook_secret is not None:
            store.webhook_secret = data.webhook_secret
        if data.is_active is not None:
            store.is_active = data.is_active
        await self.db.flush()
        return StoreResponse.model_validate(store)

    async def delete_store(self, store_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        store = await self._get_owned(store_id, tenant_id)
        store.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    async def trigger_sync(
        self, store_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> SyncStatusResponse:
        """Mark the store for sync. In production this enqueues a background job."""
        store = await self._get_owned(store_id, tenant_id)
        # In a real system we'd enqueue via Celery / ARQ here.
        # For now we just record the sync request time.
        store.last_synced_at = datetime.now(tz=timezone.utc)
        await self.db.flush()
        return SyncStatusResponse(
            store_id=store.id,
            shopify_domain=store.shopify_domain,
            is_active=store.is_active,
            last_synced_at=store.last_synced_at,
            sync_cursor=store.sync_cursor,
        )

    async def get_sync_status(
        self, store_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> SyncStatusResponse:
        store = await self._get_owned(store_id, tenant_id)
        return SyncStatusResponse(
            store_id=store.id,
            shopify_domain=store.shopify_domain,
            is_active=store.is_active,
            last_synced_at=store.last_synced_at,
            sync_cursor=store.sync_cursor,
        )

    async def upsert_oauth_store(
        self,
        tenant_id: uuid.UUID,
        shopify_domain: str,
        name: str,
        currency: str,
        access_token: str,
    ) -> StoreResponse:
        """Create or update a store after completing Shopify OAuth."""
        existing = await self.db.scalar(
            select(Store).where(Store.shopify_domain == shopify_domain)
        )
        if existing:
            existing.name = name
            existing.currency = currency
            existing.shopify_access_token_encrypted = encrypt(access_token)
            existing.is_active = True
            existing.deleted_at = None
            store = existing
        else:
            store = Store(
                tenant_id=tenant_id,
                name=name,
                shopify_domain=shopify_domain,
                currency=currency,
                shopify_access_token_encrypted=encrypt(access_token),
            )
            self.db.add(store)
        await self.db.flush()
        return StoreResponse.model_validate(store)

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, store_id: uuid.UUID, tenant_id: uuid.UUID) -> Store:
        store = await self.db.scalar(
            select(Store)
            .where(Store.id == store_id)
            .where(Store.deleted_at.is_(None))
        )
        if not store:
            raise NotFoundError("Store", store_id)
        if store.tenant_id != tenant_id:
            raise ForbiddenError()
        return store
