import { cn, formatCents, formatDate, formatMargin } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_COLORS,
} from "@/lib/constants";
import type { Order } from "@/types/api";

interface OrderRowProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export function OrderRow({ order, onClick }: OrderRowProps) {
  const marginPositive = parseFloat(order.profit_margin) >= 0;
  const profitPositive = order.net_profit >= 0;

  return (
    <tr
      onClick={onClick ? () => onClick(order) : undefined}
      className={cn(
        "border-b border-neutral-100 transition-colors",
        onClick && "cursor-pointer hover:bg-neutral-50"
      )}
    >
      {/* Order number */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-neutral-900">
          {order.order_number}
        </span>
      </td>

      {/* Date */}
      <td className="px-4 py-3">
        <span className="text-sm text-neutral-500">
          {formatDate(order.ordered_at)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <Badge variant={ORDER_STATUS_COLORS[order.status]} dot>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </td>

      {/* Fulfillment */}
      <td className="px-4 py-3">
        <Badge variant={FULFILLMENT_STATUS_COLORS[order.fulfillment_status]} dot>
          {FULFILLMENT_STATUS_LABELS[order.fulfillment_status]}
        </Badge>
      </td>

      {/* Gross Revenue */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-neutral-800 tabular-nums">
          {formatCents(order.gross_revenue, order.currency)}
        </span>
      </td>

      {/* Net Profit */}
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            profitPositive ? "text-success-600" : "text-danger-600"
          )}
        >
          {profitPositive ? "+" : ""}
          {formatCents(order.net_profit, order.currency)}
        </span>
      </td>

      {/* Margin */}
      <td className="px-4 py-3 text-right">
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            marginPositive ? "text-success-600" : "text-danger-600"
          )}
        >
          {formatMargin(parseFloat(order.profit_margin))}
        </span>
      </td>
    </tr>
  );
}
