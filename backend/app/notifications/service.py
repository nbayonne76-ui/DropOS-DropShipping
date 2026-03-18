from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.notifications.models import ALERT_TYPES, AlertRule, Notification
from app.notifications.schemas import (
    AlertRuleResponse,
    CreateAlertRuleRequest,
    NotificationResponse,
    UnreadCountResponse,
    UpdateAlertRuleRequest,
)

logger = logging.getLogger("dropos.notifications")


class NotificationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Alert rules ───────────────────────────────────────────────────────────

    async def list_rules(self, tenant_id: uuid.UUID) -> list[AlertRuleResponse]:
        rows = await self.db.scalars(
            select(AlertRule)
            .where(AlertRule.tenant_id == tenant_id)
            .where(AlertRule.deleted_at.is_(None))
            .order_by(AlertRule.created_at.desc())
        )
        return [AlertRuleResponse.model_validate(r) for r in rows.all()]

    async def create_rule(
        self, tenant_id: uuid.UUID, data: CreateAlertRuleRequest
    ) -> AlertRuleResponse:
        if data.alert_type not in ALERT_TYPES:
            raise ValidationError(
                f"Invalid alert_type '{data.alert_type}'. "
                f"Must be one of: {', '.join(ALERT_TYPES)}."
            )
        if data.alert_type in ("margin_below", "stock_below") and data.threshold is None:
            raise ValidationError(f"'threshold' is required for alert_type '{data.alert_type}'.")

        rule = AlertRule(
            tenant_id=tenant_id,
            store_id=data.store_id,
            alert_type=data.alert_type,
            threshold=data.threshold,
            window_days=data.window_days,
            is_active=data.is_active,
        )
        self.db.add(rule)
        await self.db.flush()
        return AlertRuleResponse.model_validate(rule)

    async def update_rule(
        self, rule_id: uuid.UUID, tenant_id: uuid.UUID, data: UpdateAlertRuleRequest
    ) -> AlertRuleResponse:
        rule = await self._get_rule(rule_id, tenant_id)
        if data.threshold is not None:
            rule.threshold = data.threshold
        if data.window_days is not None:
            rule.window_days = data.window_days
        if data.is_active is not None:
            rule.is_active = data.is_active
        await self.db.flush()
        return AlertRuleResponse.model_validate(rule)

    async def delete_rule(self, rule_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
        rule = await self._get_rule(rule_id, tenant_id)
        rule.deleted_at = datetime.now(tz=timezone.utc)
        await self.db.flush()

    # ── Notifications ─────────────────────────────────────────────────────────

    async def list_notifications(
        self, tenant_id: uuid.UUID, limit: int = 30, unread_only: bool = False
    ) -> list[NotificationResponse]:
        q = (
            select(Notification)
            .where(Notification.tenant_id == tenant_id)
            .where(Notification.deleted_at.is_(None))
        )
        if unread_only:
            q = q.where(Notification.is_read.is_(False))
        q = q.order_by(Notification.created_at.desc()).limit(limit)
        rows = await self.db.scalars(q)
        return [NotificationResponse.model_validate(n) for n in rows.all()]

    async def get_unread_count(self, tenant_id: uuid.UUID) -> UnreadCountResponse:
        count = await self.db.scalar(
            select(func.count(Notification.id))
            .where(Notification.tenant_id == tenant_id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        return UnreadCountResponse(count=count or 0)

    async def mark_read(
        self, tenant_id: uuid.UUID, notification_id: uuid.UUID | None = None
    ) -> None:
        """Mark one or all notifications as read."""
        q = (
            select(Notification)
            .where(Notification.tenant_id == tenant_id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        if notification_id:
            q = q.where(Notification.id == notification_id)
        rows = await self.db.scalars(q)
        for n in rows.all():
            n.is_read = True
        await self.db.flush()

    # ── Alert evaluation ──────────────────────────────────────────────────────

    async def evaluate_all_rules(self) -> int:
        """
        Evaluate every active alert rule and create Notification records for
        any that have fired.  Returns the number of notifications created.
        """
        rules = await self.db.scalars(
            select(AlertRule)
            .where(AlertRule.is_active.is_(True))
            .where(AlertRule.deleted_at.is_(None))
        )
        created = 0
        for rule in rules.all():
            try:
                fired = await self._evaluate_rule(rule)
                if fired:
                    created += 1
            except Exception:
                logger.exception("Error evaluating rule %s", rule.id)
        return created

    async def _evaluate_rule(self, rule: AlertRule) -> bool:
        """Return True if the rule fired and a notification was created."""
        if rule.alert_type == "margin_below":
            return await self._eval_margin_below(rule)
        if rule.alert_type == "sync_failed":
            return await self._eval_sync_failed(rule)
        if rule.alert_type == "fulfillment_error":
            return await self._eval_fulfillment_error(rule)
        if rule.alert_type == "stock_below":
            return await self._eval_stock_below(rule)
        return False

    async def _eval_margin_below(self, rule: AlertRule) -> bool:
        from app.orders.models import Order

        from_dt = datetime.now(tz=timezone.utc) - timedelta(days=rule.window_days)
        q = (
            select(func.avg(Order.profit_margin))
            .where(Order.tenant_id == rule.tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.ordered_at >= from_dt)
        )
        if rule.store_id:
            q = q.where(Order.store_id == rule.store_id)

        avg = await self.db.scalar(q)
        if avg is None:
            return False  # No orders in window — don't fire

        avg_pct = float(Decimal(str(avg)) * 100)
        threshold = rule.threshold or 0.0

        if avg_pct >= threshold:
            return False  # Condition not met

        # Deduplicate: skip if an unread notification for this rule already exists
        existing = await self.db.scalar(
            select(Notification.id)
            .where(Notification.rule_id == rule.id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        if existing:
            return False

        store_label = f"store {rule.store_id}" if rule.store_id else "all stores"
        notif = Notification(
            tenant_id=rule.tenant_id,
            rule_id=rule.id,
            notification_type="margin_below",
            title="Profit margin alert",
            message=(
                f"Average margin for {store_label} over the last {rule.window_days} day(s) "
                f"is {avg_pct:.1f}%, below your threshold of {threshold:.1f}%."
            ),
        )
        self.db.add(notif)
        await self.db.flush()
        logger.info("Fired margin_below alert for rule %s (avg=%.2f%% < threshold=%.1f%%)", rule.id, avg_pct, threshold)
        return True

    async def _eval_sync_failed(self, rule: AlertRule) -> bool:
        from app.stores.models import Store

        q = (
            select(Store)
            .where(Store.tenant_id == rule.tenant_id)
            .where(Store.deleted_at.is_(None))
            .where(Store.sync_status == "error")
        )
        if rule.store_id:
            q = q.where(Store.id == rule.store_id)

        stores = await self.db.scalars(q)
        failed = list(stores.all())
        if not failed:
            return False

        store = failed[0]

        # Deduplicate
        existing = await self.db.scalar(
            select(Notification.id)
            .where(Notification.rule_id == rule.id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        if existing:
            return False

        notif = Notification(
            tenant_id=rule.tenant_id,
            rule_id=rule.id,
            notification_type="sync_failed",
            title="Store sync failed",
            message=f"The last sync for store \"{store.name}\" ended in an error. Check your store connection.",
        )
        self.db.add(notif)
        await self.db.flush()
        return True

    async def _eval_fulfillment_error(self, rule: AlertRule) -> bool:
        from app.orders.models import Order

        # Look for paid orders that have been unfulfilled for more than 24 h
        cutoff = datetime.now(tz=timezone.utc) - timedelta(hours=24)
        q = (
            select(Order)
            .where(Order.tenant_id == rule.tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.status == "paid")
            .where(Order.fulfillment_status == "unfulfilled")
            .where(Order.ordered_at <= cutoff)
        )
        if rule.store_id:
            q = q.where(Order.store_id == rule.store_id)

        orders = await self.db.scalars(q.limit(1))
        if not orders.first():
            return False

        count = await self.db.scalar(
            select(func.count(Order.id))
            .where(Order.tenant_id == rule.tenant_id)
            .where(Order.deleted_at.is_(None))
            .where(Order.status == "paid")
            .where(Order.fulfillment_status == "unfulfilled")
            .where(Order.ordered_at <= cutoff)
        )

        # Deduplicate
        existing = await self.db.scalar(
            select(Notification.id)
            .where(Notification.rule_id == rule.id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        if existing:
            return False

        notif = Notification(
            tenant_id=rule.tenant_id,
            rule_id=rule.id,
            notification_type="fulfillment_error",
            title="Unfulfilled paid orders",
            message=(
                f"{count} paid order(s) have been unfulfilled for more than 24 hours. "
                "Check the Orders page for details."
            ),
        )
        self.db.add(notif)
        await self.db.flush()
        return True

    async def _eval_stock_below(self, rule: AlertRule) -> bool:
        from app.products.models import Product, ProductVariant

        threshold = int(rule.threshold or 0)

        q = (
            select(ProductVariant)
            .join(Product, Product.id == ProductVariant.product_id)
            .where(Product.tenant_id == rule.tenant_id)
            .where(Product.deleted_at.is_(None))
            .where(ProductVariant.inventory_quantity < threshold)
        )
        if rule.store_id:
            q = q.where(Product.store_id == rule.store_id)

        variants = await self.db.scalars(q.limit(1))
        if not variants.first():
            return False

        # Count how many variants are low
        from sqlalchemy import func
        count_q = (
            select(func.count(ProductVariant.id))
            .join(Product, Product.id == ProductVariant.product_id)
            .where(Product.tenant_id == rule.tenant_id)
            .where(Product.deleted_at.is_(None))
            .where(ProductVariant.inventory_quantity < threshold)
        )
        if rule.store_id:
            count_q = count_q.where(Product.store_id == rule.store_id)

        count = await self.db.scalar(count_q) or 0

        # Deduplicate
        existing = await self.db.scalar(
            select(Notification.id)
            .where(Notification.rule_id == rule.id)
            .where(Notification.is_read.is_(False))
            .where(Notification.deleted_at.is_(None))
        )
        if existing:
            return False

        store_label = f"store {rule.store_id}" if rule.store_id else "all stores"
        notif = Notification(
            tenant_id=rule.tenant_id,
            rule_id=rule.id,
            notification_type="stock_below",
            title="Low stock alert",
            message=(
                f"{count} variant(s) in {store_label} have fewer than "
                f"{threshold} unit(s) in stock. Review your inventory."
            ),
        )
        self.db.add(notif)
        await self.db.flush()
        logger.info("Fired stock_below alert for rule %s (%d variants below %d)", rule.id, count, threshold)
        return True

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _get_rule(self, rule_id: uuid.UUID, tenant_id: uuid.UUID) -> AlertRule:
        rule = await self.db.scalar(
            select(AlertRule)
            .where(AlertRule.id == rule_id)
            .where(AlertRule.deleted_at.is_(None))
        )
        if not rule:
            raise NotFoundError("AlertRule", rule_id)
        if rule.tenant_id != tenant_id:
            raise ForbiddenError()
        return rule
