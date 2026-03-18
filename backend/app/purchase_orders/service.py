from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.purchase_orders.models import PO_TRANSITIONS, PurchaseOrder, PurchaseOrderItem
from app.purchase_orders.schemas import (
    CreatePurchaseOrderRequest,
    PurchaseOrderResponse,
    UpdatePurchaseOrderRequest,
)
from app.suppliers.models import Supplier


class PurchaseOrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_orders(
        self,
        tenant_id: uuid.UUID,
        supplier_id: uuid.UUID | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PurchaseOrderResponse]:
        q = (
            select(PurchaseOrder)
            .where(PurchaseOrder.tenant_id == tenant_id)
            .where(PurchaseOrder.deleted_at.is_(None))
            .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
        )
        if supplier_id:
            q = q.where(PurchaseOrder.supplier_id == supplier_id)
        if status:
            q = q.where(PurchaseOrder.status == status)
        q = q.order_by(PurchaseOrder.created_at.desc()).limit(limit).offset(offset)
        rows = await self.db.scalars(q)
        return [self._to_response(po) for po in rows.all()]

    async def get_order(
        self, po_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> PurchaseOrderResponse:
        po = await self._get_owned(po_id, tenant_id)
        return self._to_response(po)

    async def create_order(
        self, tenant_id: uuid.UUID, data: CreatePurchaseOrderRequest
    ) -> PurchaseOrderResponse:
        # Verify supplier exists and belongs to tenant
        supplier = await self.db.scalar(
            select(Supplier)
            .where(Supplier.id == data.supplier_id)
            .where(Supplier.tenant_id == tenant_id)
            .where(Supplier.deleted_at.is_(None))
        )
        if not supplier:
            raise NotFoundError("Supplier", data.supplier_id)

        po = PurchaseOrder(
            tenant_id=tenant_id,
            supplier_id=data.supplier_id,
            reference=data.reference,
            notes=data.notes,
            expected_delivery_date=data.expected_delivery_date,
            status="draft",
        )
        self.db.add(po)
        await self.db.flush()  # get po.id

        for item_data in data.items:
            item = PurchaseOrderItem(
                po_id=po.id,
                title=item_data.title,
                sku=item_data.sku,
                shopify_variant_id=item_data.shopify_variant_id,
                quantity=item_data.quantity,
                unit_cost_cents=item_data.unit_cost_cents,
            )
            self.db.add(item)

        await self.db.flush()
        await self.db.refresh(po, ["items", "supplier"])
        return self._to_response(po)

    async def update_order(
        self, po_id: uuid.UUID, tenant_id: uuid.UUID, data: UpdatePurchaseOrderRequest
    ) -> PurchaseOrderResponse:
        po = await self._get_owned(po_id, tenant_id)

        if data.reference is not None:
            po.reference = data.reference
        if data.notes is not None:
            po.notes = data.notes
        if data.expected_delivery_date is not None:
            po.expected_delivery_date = data.expected_delivery_date

        if data.status is not None and data.status != po.status:
            allowed = PO_TRANSITIONS.get(po.status, [])
            if data.status not in allowed:
                raise ValidationError(
                    f"Cannot transition PO from '{po.status}' to '{data.status}'. "
                    f"Allowed: {allowed or 'none'}."
                )
            po.status = data.status
            if data.status == "received":
                po.received_at = datetime.now(tz=timezone.utc)

        await self.db.flush()
        await self.db.refresh(po, ["items", "supplier"])
        return self._to_response(po)

    async def delete_order(self, po_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        po = await self._get_owned(po_id, tenant_id)
        if po.status not in ("draft", "cancelled"):
            raise ValidationError(
                f"Cannot delete a purchase order with status '{po.status}'. "
                "Only draft or cancelled orders can be deleted."
            )
        po.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_owned(self, po_id: uuid.UUID, tenant_id: uuid.UUID) -> PurchaseOrder:
        po = await self.db.scalar(
            select(PurchaseOrder)
            .where(PurchaseOrder.id == po_id)
            .where(PurchaseOrder.deleted_at.is_(None))
            .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
        )
        if not po:
            raise NotFoundError("PurchaseOrder", po_id)
        if po.tenant_id != tenant_id:
            raise ForbiddenError()
        return po

    @staticmethod
    def _to_response(po: PurchaseOrder) -> PurchaseOrderResponse:
        return PurchaseOrderResponse(
            id=po.id,
            tenant_id=po.tenant_id,
            supplier_id=po.supplier_id,
            supplier_name=po.supplier.name if po.supplier else "",
            reference=po.reference,
            status=po.status,
            notes=po.notes,
            expected_delivery_date=po.expected_delivery_date,
            received_at=po.received_at,
            items=[
                {
                    "id": item.id,
                    "po_id": item.po_id,
                    "shopify_variant_id": item.shopify_variant_id,
                    "sku": item.sku,
                    "title": item.title,
                    "quantity": item.quantity,
                    "unit_cost_cents": item.unit_cost_cents,
                    "total_cents": item.total_cents,
                }
                for item in po.items
            ],
            total_cost_cents=po.total_cost_cents,
            created_at=po.created_at,
            updated_at=po.updated_at,
        )
