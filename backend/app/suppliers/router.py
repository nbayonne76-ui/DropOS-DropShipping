from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.suppliers.schemas import (
    CreateSupplierRequest,
    LinkProductRequest,
    ProductSupplierLinkResponse,
    SupplierPerformanceResponse,
    SupplierResponse,
    UpdateSupplierRequest,
)
from app.suppliers.service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[SupplierResponse], summary="List all suppliers")
async def list_suppliers(current_user: CurrentUser, db: DbDep) -> list[SupplierResponse]:
    return await SupplierService(db).list_suppliers(current_user.id)


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new supplier",
)
async def create_supplier(
    body: CreateSupplierRequest, current_user: CurrentUser, db: DbDep
) -> SupplierResponse:
    return await SupplierService(db).create_supplier(current_user.id, body)


@router.get("/{supplier_id}", response_model=SupplierResponse, summary="Get a supplier by ID")
async def get_supplier(
    supplier_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> SupplierResponse:
    return await SupplierService(db).get_supplier(supplier_id, current_user.id)


@router.patch("/{supplier_id}", response_model=SupplierResponse, summary="Update a supplier")
async def update_supplier(
    supplier_id: uuid.UUID,
    body: UpdateSupplierRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> SupplierResponse:
    return await SupplierService(db).update_supplier(supplier_id, current_user.id, body)


@router.delete(
    "/{supplier_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a supplier",
)
async def delete_supplier(
    supplier_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> Response:
    await SupplierService(db).delete_supplier(supplier_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{supplier_id}/products",
    response_model=ProductSupplierLinkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link a Shopify product/variant to this supplier",
)
async def link_product(
    supplier_id: uuid.UUID,
    body: LinkProductRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> ProductSupplierLinkResponse:
    return await SupplierService(db).link_product(supplier_id, current_user.id, body)


@router.delete(
    "/{supplier_id}/products/{link_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a product-supplier link",
)
async def unlink_product(
    supplier_id: uuid.UUID,
    link_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
) -> Response:
    await SupplierService(db).unlink_product(supplier_id, link_id, current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{supplier_id}/products",
    response_model=list[ProductSupplierLinkResponse],
    summary="List products linked to this supplier",
)
async def list_supplier_products(
    supplier_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> list[ProductSupplierLinkResponse]:
    return await SupplierService(db).list_links(supplier_id, current_user.id)


@router.get(
    "/{supplier_id}/performance",
    response_model=list[SupplierPerformanceResponse],
    summary="Get historical performance snapshots for a supplier",
)
async def get_performance(
    supplier_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> list[SupplierPerformanceResponse]:
    return await SupplierService(db).get_performance(supplier_id, current_user.id)
