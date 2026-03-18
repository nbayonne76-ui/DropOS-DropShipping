from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict

from app.audit_log.service import AuditLogService
from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db

router = APIRouter(prefix="/audit-log", tags=["audit-log"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    actor_id: uuid.UUID | None
    action: str
    summary: str
    meta: str | None
    resource_id: str | None
    resource_type: str | None
    created_at: datetime


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_log(
    current_user: CurrentUser,
    db: DbDep,
    action: str | None = Query(default=None, description="Filter by action type"),
    resource_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[AuditLogResponse]:
    entries = await AuditLogService(db).list_entries(
        current_user.id,
        action=action,
        resource_type=resource_type,
        limit=limit,
        offset=offset,
    )
    return [AuditLogResponse.model_validate(e) for e in entries]
