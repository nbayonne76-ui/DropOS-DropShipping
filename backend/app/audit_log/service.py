from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_log.models import AuditLog


class AuditLogService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def append(
        self,
        *,
        tenant_id: uuid.UUID,
        action: str,
        summary: str,
        actor_id: uuid.UUID | None = None,
        resource_id: str | None = None,
        resource_type: str | None = None,
        meta: dict | None = None,
    ) -> AuditLog:
        """Append an immutable audit entry. Flushes but does NOT commit."""
        entry = AuditLog(
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            summary=summary,
            resource_id=resource_id,
            resource_type=resource_type,
            meta=json.dumps(meta) if meta else None,
        )
        self.db.add(entry)
        await self.db.flush()
        return entry

    async def list_entries(
        self,
        tenant_id: uuid.UUID,
        *,
        action: str | None = None,
        resource_type: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[AuditLog]:
        q = (
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant_id)
            .order_by(AuditLog.created_at.desc())
        )
        if action:
            q = q.where(AuditLog.action == action)
        if resource_type:
            q = q.where(AuditLog.resource_type == resource_type)
        q = q.offset(offset).limit(limit)
        rows = await self.db.scalars(q)
        return list(rows.all())
