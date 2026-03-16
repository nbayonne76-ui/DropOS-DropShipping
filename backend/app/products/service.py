from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.common.pagination import Page, PageParams
from app.products.models import Product
from app.products.schemas import (
    ProductLandedCostResponse,
    ProductResponse,
    UpdateProductRequest,
)
from app.tariffs.service import TariffService


class ProductService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_products(
        self,
        tenant_id: uuid.UUID,
        store_id: uuid.UUID | None,
        params: PageParams,
    ) -> Page[ProductResponse]:
        from sqlalchemy import func

        base_q = (
            select(Product)
            .where(Product.tenant_id == tenant_id)
            .where(Product.deleted_at.is_(None))
        )
        if store_id:
            base_q = base_q.where(Product.store_id == store_id)

        total = await self.db.scalar(
            select(func.count()).select_from(base_q.subquery())
        )
        rows = await self.db.scalars(
            base_q.options(selectinload(Product.variants))
            .order_by(Product.title)
            .offset(params.offset)
            .limit(params.limit)
        )
        items = [ProductResponse.model_validate(p) for p in rows.all()]
        return Page.create(items=items, total=total or 0, params=params)

    async def get_product(
        self, product_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> ProductResponse:
        product = await self._get_owned(product_id, tenant_id)
        return ProductResponse.model_validate(product)

    async def update_product(
        self,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: UpdateProductRequest,
    ) -> ProductResponse:
        product = await self._get_owned(product_id, tenant_id)

        if data.hs_code is not None:
            product.hs_code = data.hs_code
        if data.origin_country is not None:
            product.origin_country = data.origin_country

        await self.db.flush()
        return ProductResponse.model_validate(product)

    async def get_landed_cost(
        self,
        product_id: uuid.UUID,
        tenant_id: uuid.UUID,
        destination_country: str,
        value_cents: int,
    ) -> ProductLandedCostResponse:
        product = await self._get_owned(product_id, tenant_id)

        if not product.hs_code:
            raise ValidationError(
                f"Product {product_id} has no HS code set. "
                "Update the product with an hs_code before calculating landed cost."
            )
        if not product.origin_country:
            raise ValidationError(
                f"Product {product_id} has no origin_country set."
            )

        tariff_svc = TariffService(self.db)
        result = await tariff_svc.calculate_landed_cost(
            hs_code=product.hs_code,
            origin=product.origin_country,
            destination=destination_country,
            value_cents=value_cents,
        )

        return ProductLandedCostResponse(
            product_id=product.id,
            shopify_product_id=product.shopify_product_id,
            hs_code=product.hs_code,
            origin_country=product.origin_country,
            destination_country=destination_country,
            value_cents=value_cents,
            duty_rate=float(result.duty_rate),
            duty_cents=result.duty_cents,
            total_landed_cents=result.total_landed_cents,
            cached=result.cached,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, product_id: uuid.UUID, tenant_id: uuid.UUID) -> Product:
        product = await self.db.scalar(
            select(Product)
            .where(Product.id == product_id)
            .where(Product.deleted_at.is_(None))
            .options(selectinload(Product.variants))
        )
        if not product:
            raise NotFoundError("Product", product_id)
        if product.tenant_id != tenant_id:
            raise ForbiddenError()
        return product
