from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.common.exceptions import DropOSError
from app.database import AsyncSession
from app.returns.models import RETURN_REASONS, RETURN_TRANSITIONS, ReturnItem, ReturnRequest
from app.returns.schemas import CreateReturnRequest, UpdateReturnRequest


class ReturnService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_returns(
        self,
        tenant_id: uuid.UUID,
        order_id: uuid.UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ReturnRequest]:
        q = (
            select(ReturnRequest)
            .where(ReturnRequest.tenant_id == tenant_id, ReturnRequest.deleted_at.is_(None))
            .options(selectinload(ReturnRequest.items))
            .order_by(ReturnRequest.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        if order_id:
            q = q.where(ReturnRequest.order_id == order_id)
        if status:
            q = q.where(ReturnRequest.status == status)
        result = await self.db.execute(q)
        return list(result.scalars().all())

    async def get_return(self, return_id: uuid.UUID, tenant_id: uuid.UUID) -> ReturnRequest:
        result = await self.db.execute(
            select(ReturnRequest)
            .where(
                ReturnRequest.id == return_id,
                ReturnRequest.tenant_id == tenant_id,
                ReturnRequest.deleted_at.is_(None),
            )
            .options(selectinload(ReturnRequest.items))
        )
        row = result.scalar_one_or_none()
        if not row:
            raise DropOSError(404, "Return request not found.")
        return row

    async def create_return(
        self, tenant_id: uuid.UUID, data: CreateReturnRequest
    ) -> ReturnRequest:
        if data.reason not in RETURN_REASONS:
            raise DropOSError(
                422, f"Invalid reason. Must be one of: {', '.join(RETURN_REASONS)}"
            )

        # Validate order belongs to tenant
        from app.orders.models import Order
        order_result = await self.db.execute(
            select(Order).where(
                Order.id == data.order_id,
                Order.tenant_id == tenant_id,
                Order.deleted_at.is_(None),
            )
        )
        if not order_result.scalar_one_or_none():
            raise DropOSError(404, "Order not found.")

        rr = ReturnRequest(
            tenant_id=tenant_id,
            order_id=data.order_id,
            reason=data.reason,
            notes=data.notes,
            status="pending",
            refund_amount_cents=0,
        )
        self.db.add(rr)
        await self.db.flush()

        for item in data.items:
            self.db.add(
                ReturnItem(
                    return_request_id=rr.id,
                    order_line_item_id=item.order_line_item_id,
                    sku=item.sku,
                    title=item.title,
                    quantity=item.quantity,
                )
            )

        await self.db.commit()
        await self.db.refresh(rr)

        # Reload with items
        return await self.get_return(rr.id, tenant_id)

    async def update_return(
        self, return_id: uuid.UUID, tenant_id: uuid.UUID, data: UpdateReturnRequest
    ) -> ReturnRequest:
        rr = await self.get_return(return_id, tenant_id)

        if data.status is not None:
            allowed = RETURN_TRANSITIONS.get(rr.status, [])
            if data.status not in allowed:
                raise DropOSError(
                    422,
                    f"Cannot transition from '{rr.status}' to '{data.status}'. "
                    f"Allowed: {allowed or 'none'}.",
                )
            rr.status = data.status
            if data.status in ("approved", "rejected", "completed"):
                rr.resolved_at = datetime.now(timezone.utc)

        if data.resolution_notes is not None:
            rr.resolution_notes = data.resolution_notes

        if data.refund_amount_cents is not None:
            rr.refund_amount_cents = data.refund_amount_cents

        await self.db.commit()
        await self.db.refresh(rr)
        return await self.get_return(rr.id, tenant_id)

    async def delete_return(self, return_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        rr = await self.get_return(return_id, tenant_id)
        if rr.status != "pending":
            raise DropOSError(422, "Only pending return requests can be deleted.")
        rr.deleted_at = datetime.now(timezone.utc)
        await self.db.commit()
