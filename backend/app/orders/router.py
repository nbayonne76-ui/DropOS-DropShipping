from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import CurrentUser
from app.common.pagination import Page, PageParams
from app.database import AsyncSession, get_db
from app.orders.schemas import (
    FulfillOrderRequest,
    OrderFilterParams,
    OrderResponse,
    RefundResponse,
    UpdateOrderCostsRequest,
)
from app.orders.service import OrderService

router = APIRouter(prefix="/orders", tags=["Orders"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=Page[OrderResponse], summary="List orders with optional filters")
async def list_orders(
    current_user: CurrentUser,
    db: DbDep,
    params: Annotated[PageParams, Depends()],
    filters: Annotated[OrderFilterParams, Depends()],
) -> Page[OrderResponse]:
    return await OrderService(db).list_orders(current_user.id, filters, params)


@router.get("/export", summary="Export filtered orders as CSV")
async def export_orders_csv(
    current_user: CurrentUser,
    db: DbDep,
    filters: Annotated[OrderFilterParams, Depends()],
) -> StreamingResponse:
    csv_data = await OrderService(db).export_csv(current_user.id, filters)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders.csv"},
    )


@router.get("/{order_id}", response_model=OrderResponse, summary="Get a single order")
async def get_order(
    order_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> OrderResponse:
    return await OrderService(db).get_order(order_id, current_user.id)


@router.post(
    "/{order_id}/recalculate",
    response_model=OrderResponse,
    summary="Recompute net revenue, total cost, net profit, and margin for an order",
)
async def recalculate_order_profit(
    order_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> OrderResponse:
    return await OrderService(db).recalculate_profit(order_id, current_user.id)


@router.post(
    "/{order_id}/fulfill",
    response_model=OrderResponse,
    summary="Fulfill an order via Shopify Fulfillment API",
)
async def fulfill_order(
    order_id: uuid.UUID,
    body: FulfillOrderRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> OrderResponse:
    from app.audit_log.service import AuditLogService
    result = await OrderService(db).fulfill_order(order_id, current_user.id, body)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="order.fulfilled",
        summary=f"Order {result.order_number or order_id} marked as fulfilled.",
        resource_id=str(order_id),
        resource_type="order",
    )
    await db.commit()
    return result


@router.get(
    "/{order_id}/refunds",
    response_model=list[RefundResponse],
    summary="List refunds for a specific order",
)
async def list_order_refunds(
    order_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> list[RefundResponse]:
    from sqlalchemy import select

    from app.orders.models import Order
    from app.orders.refund_models import Refund

    order = await db.scalar(
        select(Order)
        .where(Order.id == order_id)
        .where(Order.tenant_id == current_user.id)
        .where(Order.deleted_at.is_(None))
    )
    if not order:
        from app.common.exceptions import NotFoundError
        raise NotFoundError("Order", order_id)

    rows = await db.scalars(
        select(Refund)
        .where(Refund.order_id == order_id)
        .where(Refund.deleted_at.is_(None))
        .order_by(Refund.created_at.desc())
    )
    return [RefundResponse.model_validate(r) for r in rows.all()]


@router.patch(
    "/{order_id}/costs",
    response_model=OrderResponse,
    summary="Manually override one or more cost layers for an order",
)
async def update_order_costs(
    order_id: uuid.UUID,
    body: UpdateOrderCostsRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> OrderResponse:
    from app.audit_log.service import AuditLogService
    result = await OrderService(db).update_order_costs(order_id, current_user.id, body)
    await AuditLogService(db).append(
        tenant_id=current_user.id,
        actor_id=current_user.id,
        action="order.costs_updated",
        summary=f"Cost layers updated for order {result.order_number or order_id}.",
        resource_id=str(order_id),
        resource_type="order",
        meta=body.model_dump(exclude_none=True),
    )
    await db.commit()
    return result
