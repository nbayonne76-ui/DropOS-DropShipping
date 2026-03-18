from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.database import get_db
from app.notifications.schemas import (
    AlertRuleResponse,
    CreateAlertRuleRequest,
    NotificationResponse,
    UnreadCountResponse,
    UpdateAlertRuleRequest,
)
from app.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _svc(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


# ── Alert rules ───────────────────────────────────────────────────────────────

@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_rules(
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
):
    return await svc.list_rules(current_user.id)


@router.post("/rules", response_model=AlertRuleResponse, status_code=201)
async def create_rule(
    data: CreateAlertRuleRequest,
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    result = await svc.create_rule(current_user.id, data)
    await db.commit()
    return result


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: uuid.UUID,
    data: UpdateAlertRuleRequest,
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    result = await svc.update_rule(rule_id, current_user.id, data)
    await db.commit()
    return result


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    await svc.delete_rule(rule_id, current_user.id)
    await db.commit()


# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    limit: int = Query(default=30, ge=1, le=100),
    unread_only: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
):
    return await svc.list_notifications(current_user.id, limit=limit, unread_only=unread_only)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
):
    return await svc.get_unread_count(current_user.id)


@router.post("/mark-read", status_code=204)
async def mark_read(
    notification_id: uuid.UUID | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    svc: NotificationService = Depends(_svc),
    db: AsyncSession = Depends(get_db),
):
    """Mark one (by notification_id) or all notifications as read."""
    await svc.mark_read(current_user.id, notification_id)
    await db.commit()
