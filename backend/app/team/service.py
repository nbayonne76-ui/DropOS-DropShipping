from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.team.models import TEAM_ROLES, TeamMember
from app.team.schemas import InviteRequest, TeamMemberResponse, UpdateRoleRequest

MUTABLE_ROLES = {"viewer", "admin"}  # owner role cannot be assigned via API


class TeamService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_member(self, member_id: uuid.UUID, owner_id: uuid.UUID) -> TeamMember:
        member = await self.db.scalar(
            select(TeamMember)
            .where(TeamMember.id == member_id)
            .where(TeamMember.owner_id == owner_id)
            .where(TeamMember.deleted_at.is_(None))
        )
        if not member:
            raise NotFoundError("TeamMember", member_id)
        return member

    def _to_response(self, m: TeamMember) -> TeamMemberResponse:
        return TeamMemberResponse(
            id=m.id,
            owner_id=m.owner_id,
            user_id=m.user_id,
            role=m.role,
            created_at=m.created_at,
            email=m.user.email,
            full_name=m.user.full_name,
        )

    # ── Public API ────────────────────────────────────────────────────────────

    async def list_members(self, owner_id: uuid.UUID) -> list[TeamMemberResponse]:
        rows = await self.db.scalars(
            select(TeamMember)
            .where(TeamMember.owner_id == owner_id)
            .where(TeamMember.deleted_at.is_(None))
            .order_by(TeamMember.created_at.asc())
        )
        # Eagerly load the related user for each member
        members = []
        for m in rows.all():
            # Trigger lazy load of m.user (already in identity map after select)
            await self.db.refresh(m, ["user"])
            members.append(self._to_response(m))
        return members

    async def invite_member(
        self, owner_id: uuid.UUID, data: InviteRequest, requesting_user_id: uuid.UUID
    ) -> TeamMemberResponse:
        from app.auth.models import User

        if data.role not in MUTABLE_ROLES:
            raise ValidationError(
                f"Invalid role '{data.role}'. Must be one of: {', '.join(sorted(MUTABLE_ROLES))}."
            )

        # Look up the invited user by email
        target = await self.db.scalar(
            select(User).where(User.email == data.email)
        )
        if not target:
            raise NotFoundError("User", data.email)

        if target.id == owner_id:
            raise ValidationError("The account owner is already a member.")

        # Check for duplicate
        existing = await self.db.scalar(
            select(TeamMember)
            .where(TeamMember.owner_id == owner_id)
            .where(TeamMember.user_id == target.id)
            .where(TeamMember.deleted_at.is_(None))
        )
        if existing:
            raise ValidationError(f"{data.email} is already a team member.")

        member = TeamMember(
            owner_id=owner_id,
            user_id=target.id,
            role=data.role,
        )
        self.db.add(member)
        await self.db.flush()
        await self.db.refresh(member, ["user"])
        return self._to_response(member)

    async def update_role(
        self,
        member_id: uuid.UUID,
        owner_id: uuid.UUID,
        data: UpdateRoleRequest,
    ) -> TeamMemberResponse:
        if data.role not in MUTABLE_ROLES:
            raise ValidationError(
                f"Invalid role '{data.role}'. Must be one of: {', '.join(sorted(MUTABLE_ROLES))}."
            )

        member = await self._get_member(member_id, owner_id)

        if member.role == "owner":
            raise ForbiddenError()  # Owner role is immutable

        member.role = data.role
        await self.db.flush()
        await self.db.refresh(member, ["user"])
        return self._to_response(member)

    async def remove_member(
        self, member_id: uuid.UUID, owner_id: uuid.UUID
    ) -> None:
        from datetime import datetime, timezone

        member = await self._get_member(member_id, owner_id)

        if member.role == "owner":
            raise ForbiddenError()  # Cannot remove the owner

        member.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()
