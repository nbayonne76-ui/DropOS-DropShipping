from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel

# Valid subscription plans in ascending order of capability
PLAN_ORDER = ["free", "starter", "growth", "pro"]


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(Text, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Subscription plan: free | starter | growth | pro
    plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    # Timezone stored as IANA string e.g. "Europe/Paris"
    timezone: Mapped[str] = mapped_column(String(60), default="UTC", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="select",
    )
    stores: Mapped[list["Store"]] = relationship(
        "Store",
        back_populates="owner",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def has_plan(self, required: str) -> bool:
        """Return True if the user's plan is >= *required* in PLAN_ORDER."""
        try:
            return PLAN_ORDER.index(self.plan) >= PLAN_ORDER.index(required)
        except ValueError:
            return False

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} plan={self.plan!r}>"


class RefreshToken(BaseModel):
    __tablename__ = "refresh_tokens"

    token: Mapped[str] = mapped_column(Text, unique=True, nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")

    @property
    def is_valid(self) -> bool:
        from datetime import timezone

        return not self.revoked and self.expires_at > datetime.now(tz=timezone.utc)

    def __repr__(self) -> str:
        return f"<RefreshToken user_id={self.user_id} revoked={self.revoked}>"
