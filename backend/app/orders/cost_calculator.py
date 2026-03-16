"""Pure cost calculation functions — zero database or IO dependencies.

All monetary amounts are integers representing the smallest currency unit
(e.g. cents for USD/EUR).  Margin is returned as a Decimal rounded to 4
decimal places (e.g. ``Decimal("0.3250")`` means 32.50%).
"""
from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal


def compute_total_cost(
    cogs: int,
    shipping: int,
    platform_fee: int,
    payment_fee: int,
    chargeback_fee: int,
    refund_fee: int,
    fx_loss: int,
    import_duty: int,
) -> int:
    """Sum all 8 cost layers and return total cost in cents.

    Args:
        cogs: Cost of goods sold.
        shipping: Outbound shipping cost charged to merchant.
        platform_fee: Platform subscription fee allocated per order.
        payment_fee: Payment processor transaction fee.
        chargeback_fee: Chargeback / dispute fee.
        refund_fee: Cost of processing refunds.
        fx_loss: Foreign-exchange conversion loss.
        import_duty: Customs / import duty.

    Returns:
        Total cost as a non-negative integer (cents).
    """
    total = (
        cogs
        + shipping
        + platform_fee
        + payment_fee
        + chargeback_fee
        + refund_fee
        + fx_loss
        + import_duty
    )
    return max(0, total)


def compute_net_profit(net_revenue: int, total_cost: int) -> int:
    """Compute net profit.

    Args:
        net_revenue: Gross revenue minus refunds, in cents.
        total_cost: Total of all cost layers, in cents.

    Returns:
        Net profit in cents (can be negative for loss-making orders).
    """
    return net_revenue - total_cost


def compute_profit_margin(net_profit: int, net_revenue: int) -> Decimal | None:
    """Compute profit margin as a Decimal fraction rounded to 4 decimal places.

    Returns ``None`` when *net_revenue* is zero to avoid division by zero.

    Args:
        net_profit: Net profit in cents.
        net_revenue: Net revenue in cents.

    Returns:
        Profit margin as a Decimal (e.g. ``Decimal("0.3250")`` for 32.50%),
        or ``None`` if net_revenue is zero.
    """
    if net_revenue == 0:
        return None
    margin = Decimal(net_profit) / Decimal(net_revenue)
    return margin.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def recalculate_order(
    *,
    gross_revenue: int,
    refund_amount: int,
    cogs: int,
    shipping: int,
    platform_fee: int,
    payment_fee: int,
    chargeback_fee: int,
    refund_fee: int,
    fx_loss: int,
    import_duty: int,
) -> dict:
    """Convenience wrapper that returns a dict of all derived fields.

    Suitable for spreading into an ORM model update::

        order.__dict__.update(recalculate_order(...))
    """
    net_revenue = gross_revenue - refund_amount
    total_cost = compute_total_cost(
        cogs, shipping, platform_fee, payment_fee,
        chargeback_fee, refund_fee, fx_loss, import_duty,
    )
    net_profit = compute_net_profit(net_revenue, total_cost)
    profit_margin = compute_profit_margin(net_profit, net_revenue)

    return {
        "net_revenue": net_revenue,
        "total_cost": total_cost,
        "net_profit": net_profit,
        "profit_margin": profit_margin,
    }
