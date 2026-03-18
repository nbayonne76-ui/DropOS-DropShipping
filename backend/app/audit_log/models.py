from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import BaseModel

# Known action types — open-ended string so new actions can be added without migration
AUDIT_ACTIONS = [
    "order.fulfilled",
    "order.refunded",
    "order.costs_updated",
    "store.synced",
    "store.created",
    "store.deleted",
    "team.member_invited",
    "team.member_removed",
    "team.role_changed",
    "billing.plan_changed",
    "alert.fired",
    "api_key.created",
    "api_key.revoked",
]


class AuditLog(BaseModel):
    """
    Immutable append-only record of significant tenant actions.

    Rows are never updated or soft-deleted — deleted_at is intentionally
    unused so that the audit trail cannot be erased by normal service logic.
    """
    __tablename__ = "audit_log"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Who performed the action (may be null for system/background jobs)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    # Human-readable description
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    # Optional JSON blob with extra context (e.g. old/new values)
    meta: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Optional FK to the affected resource (stored as string for flexibility)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    resource_type: Mapped[str | None] = mapped_column(String(40), nullable=True)

    def __repr__(self) -> str:
        return f"<AuditLog action={self.action!r} tenant={self.tenant_id}>"
