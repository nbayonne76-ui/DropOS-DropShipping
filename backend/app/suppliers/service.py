from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.common.security import encrypt
from app.suppliers.models import ProductSupplierLink, Supplier, SupplierPerformanceSnapshot
from app.suppliers.schemas import (
    CreateSupplierRequest,
    LinkProductRequest,
    ProductSupplierLinkResponse,
    SupplierPerformanceResponse,
    SupplierResponse,
    UpdateSupplierRequest,
)


class SupplierService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_suppliers(self, tenant_id: uuid.UUID) -> list[SupplierResponse]:
        rows = await self.db.scalars(
            select(Supplier)
            .where(Supplier.tenant_id == tenant_id)
            .where(Supplier.deleted_at.is_(None))
            .order_by(Supplier.name)
        )
        return [SupplierResponse.model_validate(s) for s in rows.all()]

    async def get_supplier(
        self, supplier_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> SupplierResponse:
        supplier = await self._get_owned(supplier_id, tenant_id)
        return SupplierResponse.model_validate(supplier)

    async def create_supplier(
        self, tenant_id: uuid.UUID, data: CreateSupplierRequest
    ) -> SupplierResponse:
        supplier = Supplier(
            tenant_id=tenant_id,
            name=data.name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            website=data.website,
            country=data.country,
            notes=data.notes,
            api_key_encrypted=encrypt(data.api_key) if data.api_key else None,
            api_secret_encrypted=encrypt(data.api_secret) if data.api_secret else None,
            api_endpoint=data.api_endpoint,
        )
        self.db.add(supplier)
        await self.db.flush()
        return SupplierResponse.model_validate(supplier)

    async def update_supplier(
        self,
        supplier_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: UpdateSupplierRequest,
    ) -> SupplierResponse:
        supplier = await self._get_owned(supplier_id, tenant_id)

        if data.name is not None:
            supplier.name = data.name
        if data.contact_email is not None:
            supplier.contact_email = data.contact_email
        if data.contact_phone is not None:
            supplier.contact_phone = data.contact_phone
        if data.website is not None:
            supplier.website = data.website
        if data.country is not None:
            supplier.country = data.country
        if data.notes is not None:
            supplier.notes = data.notes
        if data.api_key is not None:
            supplier.api_key_encrypted = encrypt(data.api_key)
        if data.api_secret is not None:
            supplier.api_secret_encrypted = encrypt(data.api_secret)
        if data.api_endpoint is not None:
            supplier.api_endpoint = data.api_endpoint

        await self.db.flush()
        return SupplierResponse.model_validate(supplier)

    async def delete_supplier(
        self, supplier_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> None:
        supplier = await self._get_owned(supplier_id, tenant_id)
        supplier.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    async def link_product(
        self,
        supplier_id: uuid.UUID,
        tenant_id: uuid.UUID,
        data: LinkProductRequest,
    ) -> ProductSupplierLinkResponse:
        supplier = await self._get_owned(supplier_id, tenant_id)

        # Check for existing link
        existing = await self.db.scalar(
            select(ProductSupplierLink)
            .where(ProductSupplierLink.supplier_id == supplier_id)
            .where(ProductSupplierLink.shopify_variant_id == data.shopify_variant_id)
        )
        if existing:
            raise ConflictError("This product/variant is already linked to this supplier.")

        link = ProductSupplierLink(
            supplier_id=supplier_id,
            tenant_id=tenant_id,
            shopify_product_id=data.shopify_product_id,
            shopify_variant_id=data.shopify_variant_id,
            supplier_sku=data.supplier_sku,
            unit_cost_cents=data.unit_cost_cents,
            lead_time_days=data.lead_time_days,
            moq=data.moq,
        )
        self.db.add(link)
        await self.db.flush()
        return ProductSupplierLinkResponse.model_validate(link)

    async def unlink_product(
        self,
        supplier_id: uuid.UUID,
        link_id: uuid.UUID,
        tenant_id: uuid.UUID,
    ) -> None:
        link = await self.db.get(ProductSupplierLink, link_id)
        if not link or link.supplier_id != supplier_id or link.tenant_id != tenant_id:
            raise NotFoundError("ProductSupplierLink", link_id)
        await self.db.delete(link)
        await self.db.flush()

    async def list_links(
        self, supplier_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> list[ProductSupplierLinkResponse]:
        await self._get_owned(supplier_id, tenant_id)  # access check
        rows = await self.db.scalars(
            select(ProductSupplierLink)
            .where(ProductSupplierLink.supplier_id == supplier_id)
            .order_by(ProductSupplierLink.id)
        )
        return [ProductSupplierLinkResponse.model_validate(r) for r in rows.all()]

    async def get_performance(
        self, supplier_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> list[SupplierPerformanceResponse]:
        await self._get_owned(supplier_id, tenant_id)  # access check
        rows = await self.db.scalars(
            select(SupplierPerformanceSnapshot)
            .where(SupplierPerformanceSnapshot.supplier_id == supplier_id)
            .order_by(SupplierPerformanceSnapshot.period_start.desc())
        )
        return [SupplierPerformanceResponse.model_validate(r) for r in rows.all()]

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(
        self, supplier_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> Supplier:
        supplier = await self.db.scalar(
            select(Supplier)
            .where(Supplier.id == supplier_id)
            .where(Supplier.deleted_at.is_(None))
        )
        if not supplier:
            raise NotFoundError("Supplier", supplier_id)
        if supplier.tenant_id != tenant_id:
            raise ForbiddenError()
        return supplier
