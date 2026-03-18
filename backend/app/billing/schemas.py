from __future__ import annotations

from pydantic import BaseModel


class SubscriptionResponse(BaseModel):
    """Current billing state for the authenticated user."""

    plan: str
    stripe_customer_id: str | None
    """Null until the user has initiated at least one checkout."""
    status: str
    """
    One of: active | trialing | past_due | canceled | free.
    'free' means no Stripe subscription exists.
    """


class CheckoutSessionResponse(BaseModel):
    url: str
    """Stripe-hosted checkout URL — redirect the browser here."""


class BillingPortalResponse(BaseModel):
    url: str
    """Stripe billing-portal URL — lets the user manage/cancel their subscription."""
