from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_keys.models import ApiKey
from app.api_keys.schemas import ApiKeyCreatedResponse, ApiKeyResponse, CreateApiKeyRequest
from app.common.exceptions import NotFoundError

# Keys are prefixed so they're recognisable in logs / secrets scanners
_KEY_PREFIX = "dsk_"
# Length of the random part (bytes → hex = 2× chars)
_KEY_BYTES = 32  # 64 hex chars → 256-bit entropy


def _generate_raw_key() -> str:
    return _KEY_PREFIX + secrets.token_hex(_KEY_BYTES)


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


class ApiKeyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_keys(self, tenant_id: uuid.UUID) -> list[ApiKeyResponse]:
        rows = await self.db.scalars(
            select(ApiKey)
            .where(ApiKey.tenant_id == tenant_id)
            .where(ApiKey.deleted_at.is_(None))
            .order_by(ApiKey.created_at.desc())
        )
        return [ApiKeyResponse.model_validate(k) for k in rows.all()]

    async def create_key(
        self, tenant_id: uuid.UUID, data: CreateApiKeyRequest
    ) -> ApiKeyCreatedResponse:
        raw_key = _generate_raw_key()
        key = ApiKey(
            tenant_id=tenant_id,
            name=data.name,
            prefix=raw_key[:12],      # e.g. "dsk_a1b2c3d4"
            key_hash=_hash_key(raw_key),
            is_active=True,
        )
        self.db.add(key)
        await self.db.flush()
        response = ApiKeyCreatedResponse.model_validate(key)
        response.raw_key = raw_key  # attach the plaintext — shown once only
        return response

    async def revoke_key(self, key_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        key = await self._get_key(key_id, tenant_id)
        key.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    async def authenticate(self, raw_key: str) -> ApiKey | None:
        """Look up a key by its hash and update last_used_at. Returns None if invalid."""
        key_hash = _hash_key(raw_key)
        key = await self.db.scalar(
            select(ApiKey)
            .where(ApiKey.key_hash == key_hash)
            .where(ApiKey.is_active.is_(True))
            .where(ApiKey.deleted_at.is_(None))
        )
        if key:
            key.last_used_at = datetime.now(tz=timezone.utc).isoformat()
            await self.db.flush()
        return key

    async def _get_key(self, key_id: uuid.UUID, tenant_id: uuid.UUID) -> ApiKey:
        key = await self.db.scalar(
            select(ApiKey)
            .where(ApiKey.id == key_id)
            .where(ApiKey.tenant_id == tenant_id)
            .where(ApiKey.deleted_at.is_(None))
        )
        if not key:
            raise NotFoundError("ApiKey", key_id)
        return key
