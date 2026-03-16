from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import CurrentUser
from app.common.pagination import Page, PageParams
from app.database import AsyncSession, get_db
from app.products.schemas import (
    ProductLandedCostResponse,
    ProductResponse,
    UpdateProductRequest,
)
from app.products.service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=Page[ProductResponse], summary="List products")
async def list_products(
    current_user: CurrentUser,
    db: DbDep,
    params: Annotated[PageParams, Depends()],
    store_id: uuid.UUID | None = Query(default=None),
) -> Page[ProductResponse]:
    return await ProductService(db).list_products(current_user.id, store_id, params)


@router.get("/{product_id}", response_model=ProductResponse, summary="Get a product by ID")
async def get_product(
    product_id: uuid.UUID, current_user: CurrentUser, db: DbDep
) -> ProductResponse:
    return await ProductService(db).get_product(product_id, current_user.id)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update product trade fields (HS code, origin country)",
)
async def update_product(
    product_id: uuid.UUID,
    body: UpdateProductRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> ProductResponse:
    return await ProductService(db).update_product(product_id, current_user.id, body)


@router.get(
    "/{product_id}/landed-cost",
    response_model=ProductLandedCostResponse,
    summary="Calculate landed cost for a product",
)
async def get_landed_cost(
    product_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbDep,
    destination_country: str = Query(
        max_length=2,
        description="ISO 3166-1 alpha-2 destination country code.",
    ),
    value_cents: int = Query(
        ge=0,
        description="Declared customs value in cents.",
    ),
) -> ProductLandedCostResponse:
    return await ProductService(db).get_landed_cost(
        product_id, current_user.id, destination_country, value_cents
    )
