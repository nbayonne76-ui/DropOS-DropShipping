from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api_keys.schemas import ApiKeyCreatedResponse, ApiKeyResponse, CreateApiKeyRequest
from app.api_keys.service import ApiKeyService
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import get_db

router = APIRouter(prefix="/api-keys", tags=["api-keys"])


def _svc(db: AsyncSession = Depends(get_db)) -> ApiKeyService:
    return ApiKeyService(db)


@router.get("", response_model=list[ApiKeyResponse])
async def list_keys(
    current_user: User = Depends(get_current_user),
    svc: ApiKeyService = Depends(_svc),
):
    return await svc.list_keys(current_user.id)


@router.post("", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_key(
    data: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    svc: ApiKeyService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key. The raw key is returned **once** and cannot be retrieved again."""
    from app.audit_log.service import AuditLogService
    result = await svc.create_key(current_user.id, data)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="api_key.created",
        summary=f"API key '{data.name}' created.",
        resource_id=str(result.id),
        resource_type="api_key",
    )
    await db.commit()
    return result


@router.delete("/{key_id}", status_code=204)
async def revoke_key(
    key_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    svc: ApiKeyService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    from app.audit_log.service import AuditLogService
    await svc.revoke_key(key_id, current_user.id)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="api_key.revoked",
        summary=f"API key {key_id} revoked.",
        resource_id=str(key_id),
        resource_type="api_key",
    )
    await db.commit()
