from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse

from app.auth.dependencies import CurrentUser
from app.common.pagination import Page, PageParams
from app.database import AsyncSession, get_db
from app.orders.schemas import (
    OrderFilterParams,
    OrderResponse,
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
    return await OrderService(db).update_order_costs(order_id, current_user.id, body)
