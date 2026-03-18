from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel

TEAM_ROLES = ["viewer", "admin", "owner"]


class TeamMember(BaseModel):
    """
    Links a User to a tenant account with a specific role.

    - owner:  The account creator — full access, cannot be removed.
    - admin:  Can manage stores, orders, products, and team members (except owner).
    - viewer: Read-only access across the dashboard.

    The owner_id (tenant_id) is the User.id of the account owner.
    The user_id is the team member's own User.id (may be the same as owner_id for
    the implicit owner row, but is typically a different user).
    """
    __tablename__ = "team_members"
    __table_args__ = (
        # One membership per (tenant, user) pair
        UniqueConstraint("owner_id", "user_id", name="uq_team_members_owner_user"),
    )

    # The account this membership belongs to
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The user who is a member
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="viewer")

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])  # type: ignore[name-defined]
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<TeamMember owner={self.owner_id} user={self.user_id} role={self.role!r}>"
