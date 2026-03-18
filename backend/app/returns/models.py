from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel, TenantMixin

RETURN_STATUSES = ["pending", "approved", "rejected", "completed"]

RETURN_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["approved", "rejected"],
    "approved": ["completed", "rejected"],
    "rejected": [],
    "completed": [],
}

RETURN_REASONS = [
    "defective",
    "wrong_item",
    "not_as_described",
    "changed_mind",
    "damaged_in_transit",
    "other",
]


class ReturnRequest(TenantMixin, BaseModel):
    """
    A merchant-initiated return request linked to an Order.

    State machine:  pending → approved → completed
                    pending → rejected
                    approved → rejected
    """

    __tablename__ = "return_requests"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="pending | approved | rejected | completed",
    )
    reason: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="defective | wrong_item | not_as_described | changed_mind | damaged_in_transit | other",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Refund amount decided on approval (cents)
    refund_amount_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    order: Mapped["Order"] = relationship("Order", lazy="select")  # type: ignore[name-defined]
    items: Mapped[list["ReturnItem"]] = relationship(
        "ReturnItem",
        back_populates="return_request",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<ReturnRequest id={self.id} order={self.order_id} status={self.status!r}>"


class ReturnItem(BaseModel):
    """A single line-item within a ReturnRequest."""

    __tablename__ = "return_items"

    return_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("return_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # References the original OrderLineItem
    order_line_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("order_line_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    sku: Mapped[str | None] = mapped_column(String(200), nullable=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    return_request: Mapped["ReturnRequest"] = relationship(
        "ReturnRequest", back_populates="items"
    )
