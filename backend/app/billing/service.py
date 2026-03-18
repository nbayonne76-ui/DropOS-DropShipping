"""
Billing service — wraps the Stripe Python SDK.

All Stripe calls are synchronous (the SDK is not async-native) but are
lightweight enough that they don't block the event loop meaningfully in
practice.  Use ``asyncio.to_thread`` for production workloads if needed.
"""
from __future__ import annotations

import logging
import uuid

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import PLAN_ORDER, User
from app.billing.schemas import (
    BillingPortalResponse,
    CheckoutSessionResponse,
    SubscriptionResponse,
)
from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.config import settings

logger = logging.getLogger("dropos.billing")

# Plan → Stripe Price ID mapping (read from settings at call time so tests can
# override settings without restarting the process)
def _price_id_for_plan(plan: str) -> str:
    mapping = {
        "starter": settings.STRIPE_PRICE_STARTER,
        "growth": settings.STRIPE_PRICE_GROWTH,
        "pro": settings.STRIPE_PRICE_PRO,
    }
    price_id = mapping.get(plan, "")
    if not price_id:
        raise ValidationError(f"No Stripe price configured for plan '{plan}'.")
    return price_id

# Stripe → internal plan mapping derived from price IDs
def _plan_from_price_id(price_id: str) -> str | None:
    mapping = {
        settings.STRIPE_PRICE_STARTER: "starter",
        settings.STRIPE_PRICE_GROWTH: "growth",
        settings.STRIPE_PRICE_PRO: "pro",
    }
    return mapping.get(price_id)


class BillingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        stripe.api_key = settings.STRIPE_SECRET_KEY

    # ── Public methods ────────────────────────────────────────────────────────

    async def get_subscription(self, user_id: uuid.UUID) -> SubscriptionResponse:
        user = await self._get_user(user_id)

        if not user.stripe_customer_id:
            return SubscriptionResponse(
                plan=user.plan,
                stripe_customer_id=None,
                status="free",
            )

        # Fetch the most recent active subscription from Stripe
        subs = stripe.Subscription.list(
            customer=user.stripe_customer_id,
            limit=1,
            status="active",
        )
        if subs.data:
            sub = subs.data[0]
            return SubscriptionResponse(
                plan=user.plan,
                stripe_customer_id=user.stripe_customer_id,
                status=sub.status,
            )

        # Customer exists but no active sub — may be canceled or past_due
        all_subs = stripe.Subscription.list(
            customer=user.stripe_customer_id, limit=1
        )
        status = all_subs.data[0].status if all_subs.data else "free"
        return SubscriptionResponse(
            plan=user.plan,
            stripe_customer_id=user.stripe_customer_id,
            status=status,
        )

    async def create_checkout_session(
        self, user_id: uuid.UUID, plan: str
    ) -> CheckoutSessionResponse:
        if plan not in ("starter", "growth", "pro"):
            raise ValidationError(f"Invalid plan: '{plan}'. Must be starter, growth, or pro.")

        user = await self._get_user(user_id)

        # Ensure Stripe customer exists
        customer_id = await self._ensure_customer(user)

        price_id = _price_id_for_plan(plan)

        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/billing?success=1",
            cancel_url=f"{settings.FRONTEND_URL}/billing?canceled=1",
            metadata={"user_id": str(user_id), "plan": plan},
            subscription_data={"metadata": {"user_id": str(user_id), "plan": plan}},
        )
        logger.info("Created Stripe checkout session %s for user %s plan=%s", session.id, user_id, plan)
        return CheckoutSessionResponse(url=session.url)

    async def create_portal_session(self, user_id: uuid.UUID) -> BillingPortalResponse:
        user = await self._get_user(user_id)
        if not user.stripe_customer_id:
            raise ValidationError("No billing account found. Please subscribe first.")

        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/billing",
        )
        return BillingPortalResponse(url=session.url)

    async def handle_webhook(self, payload: bytes, sig_header: str) -> None:
        """Verify Stripe webhook signature and process the event."""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            raise ForbiddenError()

        etype = event["type"]
        logger.info("Stripe webhook received: %s", etype)

        if etype in ("customer.subscription.created", "customer.subscription.updated"):
            await self._sync_subscription(event["data"]["object"])
        elif etype == "customer.subscription.deleted":
            await self._on_subscription_deleted(event["data"]["object"])

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _ensure_customer(self, user: User) -> str:
        """Return existing Stripe customer ID or create a new one."""
        if user.stripe_customer_id:
            return user.stripe_customer_id

        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name or user.email,
            metadata={"user_id": str(user.id)},
        )
        user.stripe_customer_id = customer.id
        await self.db.flush()
        logger.info("Created Stripe customer %s for user %s", customer.id, user.id)
        return customer.id

    async def _sync_subscription(self, sub: dict) -> None:
        """Update user.plan from a Stripe subscription object."""
        customer_id = sub.get("customer")
        if not customer_id:
            return

        # Find the price ID from the first subscription item
        items = sub.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None
        plan = _plan_from_price_id(price_id) if price_id else None
        if not plan:
            logger.warning("_sync_subscription: unknown price_id=%s", price_id)
            return

        user = await self.db.scalar(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        if not user:
            logger.warning("_sync_subscription: no user for customer %s", customer_id)
            return

        if user.plan != plan:
            old_plan = user.plan
            logger.info("Upgrading user %s plan %s → %s", user.id, old_plan, plan)
            user.plan = plan
            await self.db.flush()
            from app.audit_log.service import AuditLogService
            await AuditLogService(self.db).append(
                tenant_id=user.id,
                action="billing.plan_changed",
                summary=f"Subscription plan changed from {old_plan} to {plan}.",
                resource_id=str(user.id),
                resource_type="user",
                meta={"old_plan": old_plan, "new_plan": plan},
            )

    async def _on_subscription_deleted(self, sub: dict) -> None:
        """Downgrade user to free when their subscription is canceled."""
        customer_id = sub.get("customer")
        if not customer_id:
            return

        user = await self.db.scalar(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        if user and user.plan != "free":
            old_plan = user.plan
            logger.info("Subscription canceled — downgrading user %s to free", user.id)
            user.plan = "free"
            await self.db.flush()
            from app.audit_log.service import AuditLogService
            await AuditLogService(self.db).append(
                tenant_id=user.id,
                action="billing.plan_changed",
                summary=f"Subscription canceled — plan downgraded from {old_plan} to free.",
                resource_id=str(user.id),
                resource_type="user",
                meta={"old_plan": old_plan, "new_plan": "free"},
            )

    async def _get_user(self, user_id: uuid.UUID) -> User:
        user = await self.db.get(User, user_id)
        if not user:
            raise NotFoundError("User", user_id)
        return user
