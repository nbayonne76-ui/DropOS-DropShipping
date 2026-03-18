from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, status

from app.auth.dependencies import CurrentUser
from app.billing.schemas import (
    BillingPortalResponse,
    CheckoutSessionResponse,
    SubscriptionResponse,
)
from app.billing.service import BillingService
from app.database import AsyncSession, get_db

router = APIRouter(prefix="/billing", tags=["Billing"])

DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get(
    "/subscription",
    response_model=SubscriptionResponse,
    summary="Get current subscription status and plan",
)
async def get_subscription(
    current_user: CurrentUser,
    db: DbDep,
) -> SubscriptionResponse:
    return await BillingService(db).get_subscription(current_user.id)


@router.post(
    "/checkout",
    response_model=CheckoutSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Create a Stripe Checkout session for the given plan",
)
async def create_checkout(
    plan: str,
    current_user: CurrentUser,
    db: DbDep,
) -> CheckoutSessionResponse:
    return await BillingService(db).create_checkout_session(current_user.id, plan)


@router.post(
    "/portal",
    response_model=BillingPortalResponse,
    status_code=status.HTTP_200_OK,
    summary="Create a Stripe billing portal session",
)
async def create_portal(
    current_user: CurrentUser,
    db: DbDep,
) -> BillingPortalResponse:
    return await BillingService(db).create_portal_session(current_user.id)


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Receive Stripe webhook events (HMAC-verified, no auth required)",
    include_in_schema=False,
)
async def stripe_webhook(
    request: Request,
    db: DbDep,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
) -> dict:
    payload = await request.body()
    if not stripe_signature:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    await BillingService(db).handle_webhook(payload, stripe_signature)
    return {"received": True}
