from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel, TenantMixin


class Order(TenantMixin, BaseModel):
    """A Shopify order with all cost layer columns for profit calculation."""

    __tablename__ = "orders"

    # ── Shopify identity ──────────────────────────────────────────────────────
    shopify_order_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="open",
        comment="open | fulfilled | refunded | cancelled"
    )
    ordered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # ── Revenue (all amounts in smallest currency unit, e.g. cents) ───────────
    gross_revenue: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    refund_amount: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    net_revenue: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    # ── Cost layers (8 columns) ───────────────────────────────────────────────
    cogs: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Cost of Goods Sold from supplier invoices"
    )
    shipping_cost: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Outbound shipping cost charged to merchant"
    )
    platform_fee: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Shopify subscription fee allocation per order"
    )
    payment_fee: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Payment processor transaction fee"
    )
    chargeback_fee: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Chargeback / dispute fee if applicable"
    )
    refund_fee: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Cost of processing refunds"
    )
    fx_loss: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Foreign exchange conversion loss"
    )
    import_duty: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0,
        comment="Customs / import duty (from TariffService)"
    )

    # ── Computed totals (denormalised for fast queries) ───────────────────────
    total_cost: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    net_profit: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    profit_margin: Mapped[float | None] = mapped_column(
        Numeric(7, 4), nullable=True,
        comment="Net profit / net revenue as a decimal, e.g. 0.3250"
    )

    # ── Customer / shipping ───────────────────────────────────────────────────
    customer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    shipping_country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # Relationships
    store: Mapped["Store"] = relationship("Store", back_populates="orders", lazy="select")
    line_items: Mapped[list["OrderLineItem"]] = relationship(
        "OrderLineItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        UniqueConstraint("store_id", "shopify_order_id", name="uq_orders_store_shopify"),
    )

    def __repr__(self) -> str:
        return f"<Order id={self.id} shopify={self.shopify_order_id!r} profit={self.net_profit}>"


class OrderLineItem(BaseModel):
    """Individual line item within an order."""

    __tablename__ = "order_line_items"

    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shopify_line_item_id: Mapped[str] = mapped_column(String(64), nullable=False)
    shopify_product_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    shopify_variant_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(200), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    unit_cogs: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    order: Mapped["Order"] = relationship("Order", back_populates="line_items")
