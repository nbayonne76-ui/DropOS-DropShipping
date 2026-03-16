from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.stores.schemas import (
    CreateStoreRequest,
    StoreResponse,
    SyncStatusResponse,
    UpdateStoreRequest,
)
from app.stores.service import StoreService

router = APIRouter(prefix="/stores", tags=["Stores"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[StoreResponse], summary="List all stores for the current tenant")
async def list_stores(current_user: CurrentUser, db: DbDep) -> list[StoreResponse]:
    return await StoreService(db).list_stores(current_user.id)


@router.post(
    "",
    response_model=StoreResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect a new Shopify store",
)
async def create_store(
    body: CreateStoreRequest, current_user: CurrentUser, db: DbDep
) -> StoreResponse:
    return await StoreService(db).create_store(current_user.id, body)


@router.get("/{store_id}", response_model=StoreResponse, summary="Get a single store")
async def get_store(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> StoreResponse:
    return await StoreService(db).get_store(store_id, current_user.id)


@router.patch("/{store_id}", response_model=StoreResponse, summary="Update store metadata")
async def update_store(
    store_id: uuid.UUID,
    body: UpdateStoreRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> StoreResponse:
    return await StoreService(db).update_store(store_id, current_user.id, body)


@router.delete(
    "/{store_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a store",
)
async def delete_store(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> None:
    await StoreService(db).delete_store(store_id, current_user.id)


@router.post(
    "/{store_id}/sync",
    response_model=SyncStatusResponse,
    summary="Trigger an incremental sync from Shopify",
)
async def trigger_sync(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> SyncStatusResponse:
    return await StoreService(db).trigger_sync(store_id, current_user.id)


@router.get(
    "/{store_id}/sync/status",
    response_model=SyncStatusResponse,
    summary="Get sync status for a store",
)
async def sync_status(
    store_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> SyncStatusResponse:
    return await StoreService(db).get_sync_status(store_id, current_user.id)
