from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel


class Refund(BaseModel):
    """
    A Shopify refund record associated with an Order.

    Shopify can issue multiple partial refunds against a single order.
    Each one is stored as a separate row here for auditability.
    """
    __tablename__ = "refunds"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Shopify's own refund ID — used for idempotency
    shopify_refund_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    # Amount refunded in smallest currency unit (cents)
    amount: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # When Shopify processed the refund
    refunded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    order: Mapped["Order"] = relationship("Order", back_populates="refunds")  # type: ignore[name-defined]

    def __repr__(self) -> str:
        return f"<Refund shopify_id={self.shopify_refund_id!r} amount={self.amount}>"
