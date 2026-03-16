from __future__ import annotations

import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.models import BaseModel, TenantMixin


class Store(TenantMixin, BaseModel):
    """Represents a connected Shopify store belonging to a tenant (user)."""

    __tablename__ = "stores"

    # Display
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    shopify_domain: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True,
        comment="mystore.myshopify.com"
    )

    # OAuth credentials (access token is encrypted at rest)
    shopify_access_token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Sync state
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_synced_at: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_cursor: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="Pagination cursor / since_id for incremental Shopify sync."
    )

    # Currency (ISO 4217)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="stores",
        foreign_keys=[TenantMixin.tenant_id],
        lazy="select",
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="store",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<Store id={self.id} domain={self.shopify_domain!r}>"
