from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
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


class Supplier(TenantMixin, BaseModel):
    """A product supplier / dropship vendor."""

    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Encrypted API credentials for automated ordering / inventory sync
    api_key_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_secret_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    api_endpoint: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    product_links: Mapped[list["ProductSupplierLink"]] = relationship(
        "ProductSupplierLink",
        back_populates="supplier",
        cascade="all, delete-orphan",
        lazy="select",
    )
    performance_snapshots: Mapped[list["SupplierPerformanceSnapshot"]] = relationship(
        "SupplierPerformanceSnapshot",
        back_populates="supplier",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Supplier id={self.id} name={self.name!r}>"


class ProductSupplierLink(BaseModel):
    """Many-to-many link between a Shopify product variant and a supplier."""

    __tablename__ = "product_supplier_links"

    shopify_product_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    shopify_variant_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Supplier-specific cost and identifiers
    supplier_sku: Mapped[str | None] = mapped_column(String(200), nullable=True)
    unit_cost_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    lead_time_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moq: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Minimum order quantity"
    )

    supplier: Mapped["Supplier"] = relationship(
        "Supplier", back_populates="product_links"
    )

    __table_args__ = (
        UniqueConstraint(
            "supplier_id", "shopify_variant_id",
            name="uq_product_supplier_links_supplier_variant",
        ),
    )


class SupplierPerformanceSnapshot(BaseModel):
    """Weekly/monthly aggregated performance metrics for a supplier."""

    __tablename__ = "supplier_performance_snapshots"

    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    period_end: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    total_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    on_time_deliveries: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    defect_rate: Mapped[float | None] = mapped_column(
        Numeric(6, 4), nullable=True,
        comment="Proportion of defective items (0-1)"
    )
    avg_lead_time_days: Mapped[float | None] = mapped_column(
        Numeric(6, 2), nullable=True
    )
    total_cogs_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)

    supplier: Mapped["Supplier"] = relationship(
        "Supplier", back_populates="performance_snapshots"
    )
