from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.common.models import BaseModel


class WebhookEvent(BaseModel):
    """Idempotency log for incoming Shopify webhook events."""

    __tablename__ = "webhook_events"

    store_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # X-Shopify-Webhook-Id header (Shopify guarantees uniqueness per topic)
    shopify_webhook_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True
    )
    topic: Mapped[str] = mapped_column(
        String(128), nullable=False,
        comment="e.g. 'orders/create', 'orders/updated', 'orders/paid'"
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="received",
        comment="received | processed | failed | skipped"
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "store_id", "shopify_webhook_id",
            name="uq_webhook_events_store_shopify_id",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<WebhookEvent store={self.store_id} "
            f"topic={self.topic!r} id={self.shopify_webhook_id!r}>"
        )
