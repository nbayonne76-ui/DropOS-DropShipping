from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.common.exceptions import ForbiddenError
from app.database import get_db
from app.team.schemas import InviteRequest, TeamMemberResponse, UpdateRoleRequest
from app.team.service import TeamService

router = APIRouter(prefix="/team", tags=["team"])


def _svc(db: AsyncSession = Depends(get_db)) -> TeamService:
    return TeamService(db)


def _require_starter(current_user: User) -> User:
    """Raise 403 if the user is on the free plan."""
    if not current_user.has_plan("starter"):
        raise ForbiddenError(
            detail="Team management requires a Starter plan or higher. Upgrade at /billing."
        )
    return current_user


@router.get("", response_model=list[TeamMemberResponse])
async def list_members(
    current_user: User = Depends(get_current_user),
    svc: TeamService = Depends(_svc),
):
    _require_starter(current_user)
    return await svc.list_members(current_user.id)


@router.post("", response_model=TeamMemberResponse, status_code=201)
async def invite_member(
    data: InviteRequest,
    current_user: User = Depends(get_current_user),
    svc: TeamService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    from app.audit_log.service import AuditLogService
    _require_starter(current_user)
    result = await svc.invite_member(current_user.id, data, current_user.id)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="team.member_invited",
        summary=f"{data.email} added to the team as {data.role}.",
        resource_id=str(result.user_id),
        resource_type="team_member",
    )
    await db.commit()
    return result


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_role(
    member_id: uuid.UUID,
    data: UpdateRoleRequest,
    current_user: User = Depends(get_current_user),
    svc: TeamService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    from app.audit_log.service import AuditLogService
    _require_starter(current_user)
    result = await svc.update_role(member_id, current_user.id, data)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="team.role_changed",
        summary=f"Team member {result.email} role changed to {data.role}.",
        resource_id=str(member_id),
        resource_type="team_member",
    )
    await db.commit()
    return result


@router.delete("/{member_id}", status_code=204)
async def remove_member(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    svc: TeamService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    from app.audit_log.service import AuditLogService
    _require_starter(current_user)
    await svc.remove_member(member_id, current_user.id)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="team.member_removed",
        summary=f"Team member {member_id} removed.",
        resource_id=str(member_id),
        resource_type="team_member",
    )
    await db.commit()
