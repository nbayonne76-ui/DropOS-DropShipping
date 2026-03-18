from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel, TenantMixin

PO_STATUSES = ["draft", "sent", "confirmed", "received", "cancelled"]

# Valid status transitions: current → allowed next states
PO_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["sent", "cancelled"],
    "sent": ["confirmed", "cancelled"],
    "confirmed": ["received", "cancelled"],
    "received": [],
    "cancelled": [],
}


class PurchaseOrder(TenantMixin, BaseModel):
    """A purchase order sent to a supplier."""

    __tablename__ = "purchase_orders"

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    reference: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
        comment="User-provided PO reference number (e.g. PO-2026-001)"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="draft",
        comment="draft | sent | confirmed | received | cancelled"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    supplier: Mapped["app.suppliers.models.Supplier"] = relationship(
        "Supplier", lazy="select"
    )
    items: Mapped[list["PurchaseOrderItem"]] = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        lazy="select",
    )

    @property
    def total_cost_cents(self) -> int:
        return sum(i.quantity * i.unit_cost_cents for i in self.items)

    def __repr__(self) -> str:
        return f"<PurchaseOrder id={self.id} ref={self.reference!r} status={self.status!r}>"


class PurchaseOrderItem(BaseModel):
    """A line item within a purchase order."""

    __tablename__ = "purchase_order_items"

    po_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shopify_variant_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    sku: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_cost_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    purchase_order: Mapped["PurchaseOrder"] = relationship(
        "PurchaseOrder", back_populates="items"
    )

    @property
    def total_cents(self) -> int:
        return self.quantity * self.unit_cost_cents
