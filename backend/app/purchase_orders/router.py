from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.purchase_orders.schemas import (
    CreatePurchaseOrderRequest,
    PurchaseOrderResponse,
    UpdatePurchaseOrderRequest,
)
from app.purchase_orders.service import PurchaseOrderService

router = APIRouter(prefix="/purchase-orders", tags=["Purchase Orders"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[PurchaseOrderResponse], summary="List purchase orders")
async def list_purchase_orders(
    current_user: CurrentUser,
    db: DbDep,
    supplier_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[PurchaseOrderResponse]:
    return await PurchaseOrderService(db).list_orders(
        tenant_id=current_user.id,
        supplier_id=supplier_id,
        status=status,
        limit=limit,
        offset=offset,
    )


@router.post(
    "",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a purchase order",
)
async def create_purchase_order(
    body: CreatePurchaseOrderRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> PurchaseOrderResponse:
    return await PurchaseOrderService(db).create_order(current_user.id, body)


@router.get(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
    summary="Get a purchase order by ID",
)
async def get_purchase_order(
    po_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> PurchaseOrderResponse:
    return await PurchaseOrderService(db).get_order(po_id, current_user.id)


@router.patch(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
    summary="Update a purchase order (also used to transition status)",
)
async def update_purchase_order(
    po_id: uuid.UUID,
    body: UpdatePurchaseOrderRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> PurchaseOrderResponse:
    return await PurchaseOrderService(db).update_order(po_id, current_user.id, body)


@router.delete(
    "/{po_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a draft or cancelled purchase order",
)
async def delete_purchase_order(
    po_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> Response:
    await PurchaseOrderService(db).delete_order(po_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
