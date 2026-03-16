from __future__ import annotations

import uuid

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel, TenantMixin


class Product(TenantMixin, BaseModel):
    """Mirrors a Shopify product with additional DropOS cost/trade data."""

    __tablename__ = "products"

    shopify_product_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    vendor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), default="active", nullable=False,
        comment="active | archived | draft"
    )

    # Trade compliance fields
    hs_code: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="Harmonized System commodity code for customs/duty calculation."
    )
    origin_country: Mapped[str | None] = mapped_column(
        String(2), nullable=True,
        comment="ISO 3166-1 alpha-2 country of manufacture."
    )

    # Relationships
    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant",
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="select",
    )

    __table_args__ = (
        UniqueConstraint(
            "tenant_id", "shopify_product_id",
            name="uq_products_tenant_shopify",
        ),
    )

    def __repr__(self) -> str:
        return f"<Product id={self.id} shopify={self.shopify_product_id!r} title={self.title!r}>"


class ProductVariant(BaseModel):
    """A specific variant (size/colour/etc.) of a Product."""

    __tablename__ = "product_variants"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shopify_variant_id: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Pricing
    price_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    compare_at_price_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    # Physical attributes
    weight_grams: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Weight in grams for shipping calculations."
    )
    inventory_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requires_shipping: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="variants")

    __table_args__ = (
        UniqueConstraint(
            "product_id", "shopify_variant_id",
            name="uq_product_variants_product_shopify",
        ),
    )
