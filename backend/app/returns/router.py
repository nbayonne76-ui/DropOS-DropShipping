from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.returns.schemas import (
    CreateReturnRequest,
    ReturnRequestResponse,
    UpdateReturnRequest,
)
from app.returns.service import ReturnService

router = APIRouter(prefix="/returns", tags=["Returns"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[ReturnRequestResponse], summary="List return requests")
async def list_returns(
    current_user: CurrentUser,
    db: DbDep,
    order_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ReturnRequestResponse]:
    return await ReturnService(db).list_returns(
        current_user.id, order_id, status, limit, offset
    )


@router.post("", response_model=ReturnRequestResponse, status_code=201, summary="Create a return request")
async def create_return(
    current_user: CurrentUser,
    db: DbDep,
    data: CreateReturnRequest,
) -> ReturnRequestResponse:
    return await ReturnService(db).create_return(current_user.id, data)


@router.get("/{return_id}", response_model=ReturnRequestResponse, summary="Get a return request")
async def get_return(
    return_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
) -> ReturnRequestResponse:
    return await ReturnService(db).get_return(return_id, current_user.id)


@router.patch("/{return_id}", response_model=ReturnRequestResponse, summary="Update status / resolution")
async def update_return(
    return_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
    data: UpdateReturnRequest,
) -> ReturnRequestResponse:
    return await ReturnService(db).update_return(return_id, current_user.id, data)


@router.delete("/{return_id}", status_code=204, summary="Delete a pending return request")
async def delete_return(
    return_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
) -> None:
    await ReturnService(db).delete_return(return_id, current_user.id)
