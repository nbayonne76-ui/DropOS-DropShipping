from __future__ import annotations

import logging
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger("dropos.webhooks")

# Mapping of Shopify webhook topics to handler coroutines.
# Each handler receives (payload: dict, store_id: UUID, db: AsyncSession).
_HANDLERS: dict = {}


def _register(topic: str):
    """Decorator to register a coroutine as the handler for a webhook topic."""
    def decorator(fn):
        _HANDLERS[topic] = fn
        return fn
    return decorator


@_register("orders/create")
@_register("orders/paid")
async def handle_order_create(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from sqlalchemy import select

    from app.auth.models import User
    from app.orders.service import OrderService
    from app.stores.models import Store

    store = await db.get(Store, store_id)
    if not store:
        logger.warning("handle_order_create: store %s not found", store_id)
        return

    service = OrderService(db)
    await service.ingest_from_shopify_payload(
        payload=payload,
        store_id=store_id,
        tenant_id=store.tenant_id,
    )
    logger.info(
        "Ingested order %s for store %s",
        payload.get("id"),
        store_id,
    )


@_register("orders/updated")
async def handle_order_updated(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    # Re-use the same upsert logic as create
    await handle_order_create(payload, store_id, db)


@_register("orders/cancelled")
async def handle_order_cancelled(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from sqlalchemy import select

    from app.orders.models import Order

    shopify_id = str(payload.get("id", ""))
    order = await db.scalar(
        select(Order)
        .where(Order.store_id == store_id)
        .where(Order.shopify_order_id == shopify_id)
    )
    if order:
        order.status = "cancelled"
        await db.flush()
        logger.info("Marked order %s as cancelled (store %s)", shopify_id, store_id)


@_register("orders/refunded")
async def handle_order_refunded(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    # Pull updated totals from the payload (Shopify includes the full order)
    await handle_order_create(payload, store_id, db)


@_register("app/uninstalled")
async def handle_app_uninstalled(
    payload: dict, store_id: uuid.UUID, db: AsyncSession
) -> None:
    from app.stores.models import Store
    from datetime import datetime, timezone

    store = await db.get(Store, store_id)
    if store:
        store.is_active = False
        store.shopify_access_token_encrypted = None
        await db.flush()
        logger.warning(
            "App uninstalled from store %s — store deactivated and token cleared.",
            store_id,
        )


async def dispatch_webhook(
    topic: str,
    payload: dict,
    store_id: uuid.UUID,
    db: AsyncSession,
) -> None:
    """Route an incoming webhook to the appropriate handler.

    Unknown topics are logged and silently ignored to allow Shopify to keep
    delivering without receiving retried errors.
    """
    handler = _HANDLERS.get(topic)
    if handler is None:
        logger.debug("No handler registered for topic '%s' — ignoring.", topic)
        return
    try:
        await handler(payload, store_id, db)
    except Exception as exc:
        logger.exception(
            "Webhook handler for topic '%s' raised an exception: %s", topic, exc
        )
        raise
