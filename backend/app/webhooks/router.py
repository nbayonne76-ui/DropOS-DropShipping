from __future__ import annotations

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.dependencies import CurrentUser
from app.database import AsyncSession, get_db
from app.stores.models import Store
from app.webhooks.handler import dispatch_webhook
from app.webhooks.models import WebhookEvent
from app.webhooks.verifier import verify_shopify_webhook

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


class WebhookEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    store_id: uuid.UUID
    shopify_webhook_id: str
    topic: str
    status: str
    error_message: str | None
    created_at: datetime

logger = logging.getLogger("dropos.webhooks")


@router.post(
    "/shopify/{store_id}",
    status_code=status.HTTP_200_OK,
    summary="Receive Shopify webhook events",
    description=(
        "This endpoint is called by Shopify for each subscribed event. "
        "It verifies the HMAC signature, checks for duplicate delivery, "
        "then dispatches to the appropriate domain handler."
    ),
)
async def shopify_webhook(
    store_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_shopify_topic: str = Header(alias="X-Shopify-Topic"),
    x_shopify_webhook_id: str = Header(alias="X-Shopify-Webhook-Id", default=""),
) -> dict:
    # 1. Load the store
    store = await db.scalar(
        select(Store).where(Store.id == store_id).where(Store.deleted_at.is_(None))
    )
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Store {store_id} not found.",
        )

    # 2. Verify HMAC signature
    if not await verify_shopify_webhook(request, store):
        logger.warning(
            "HMAC verification failed for store %s topic %s",
            store_id,
            x_shopify_topic,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Webhook signature verification failed.",
        )

    # 3. Idempotency check — reject duplicates
    if x_shopify_webhook_id:
        existing = await db.scalar(
            select(WebhookEvent)
            .where(WebhookEvent.store_id == store_id)
            .where(WebhookEvent.shopify_webhook_id == x_shopify_webhook_id)
        )
        if existing:
            logger.debug(
                "Duplicate webhook %s for store %s — skipping.",
                x_shopify_webhook_id,
                store_id,
            )
            return {"status": "skipped", "reason": "duplicate"}

    # 4. Persist event record before processing (for audit trail)
    event = WebhookEvent(
        store_id=store_id,
        shopify_webhook_id=x_shopify_webhook_id or str(uuid.uuid4()),
        topic=x_shopify_topic,
        status="received",
    )
    db.add(event)
    try:
        await db.flush()
    except IntegrityError:
        # Race condition — another request already inserted this webhook_id
        await db.rollback()
        return {"status": "skipped", "reason": "duplicate"}

    # 5. Dispatch to handler
    payload = await request.json()
    try:
        await dispatch_webhook(
            topic=x_shopify_topic,
            payload=payload,
            store_id=store_id,
            db=db,
        )
        event.status = "processed"
    except Exception as exc:
        event.status = "failed"
        event.error_message = str(exc)[:1024]
        logger.exception(
            "Failed to process webhook %s for store %s: %s",
            x_shopify_topic,
            store_id,
            exc,
        )
        # Return 200 so Shopify does not retry — we've logged the failure.

    await db.flush()
    return {"status": event.status}


@router.get(
    "/events",
    response_model=list[WebhookEventResponse],
    summary="List recent webhook events for the current tenant's stores",
)
async def list_webhook_events(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    store_id: uuid.UUID | None = Query(default=None, description="Filter by store ID"),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[WebhookEventResponse]:
    """Returns recent webhook events, scoped to the authenticated tenant."""
    # Collect store IDs owned by this tenant
    owned_stores = await db.scalars(
        select(Store.id)
        .where(Store.tenant_id == current_user.id)
        .where(Store.deleted_at.is_(None))
    )
    owned_ids = set(owned_stores.all())

    if store_id is not None:
        if store_id not in owned_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found.",
            )
        filter_ids = {store_id}
    else:
        filter_ids = owned_ids

    if not filter_ids:
        return []

    events = await db.scalars(
        select(WebhookEvent)
        .where(WebhookEvent.store_id.in_(filter_ids))
        .order_by(WebhookEvent.created_at.desc())
        .limit(limit)
    )
    return [WebhookEventResponse.model_validate(e) for e in events.all()]
