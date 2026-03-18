from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel


class ApiKey(BaseModel):
    """
    A personal API key that authenticates requests via the X-API-Key header.

    Only the SHA-256 hash of the raw key is stored; the plaintext is shown
    to the user exactly once at creation time and never again.

    The `prefix` (first 8 chars of the raw key, e.g. "dsk_live_") is stored
    in plaintext so the user can identify which key to revoke.
    """
    __tablename__ = "api_keys"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # First 12 chars of the raw key — shown in the UI for identification
    prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    # SHA-256 hex digest of the full raw key
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_used_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner: Mapped["User"] = relationship("User", foreign_keys=[tenant_id])  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<ApiKey name={self.name!r} prefix={self.prefix!r} active={self.is_active}>"
