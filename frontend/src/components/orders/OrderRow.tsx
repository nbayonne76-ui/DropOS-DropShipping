import { cn, formatCents, formatDate, formatMargin } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import type { Order } from "@/types/api";

interface OrderRowProps {
  order: Order;
  onClick?: (order: Order) => void;
}

export function OrderRow({ order, onClick }: OrderRowProps) {
  const marginPositive = order.profit_margin >= 0;
  const profitPositive = order.net_profit_cents >= 0;

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
          #{order.order_number}
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

      {/* Gross Revenue */}
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-medium text-neutral-800 tabular-nums">
          {formatCents(order.gross_revenue_cents, order.currency)}
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
          {formatCents(order.net_profit_cents, order.currency)}
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
          {formatMargin(order.profit_margin / 100)}
        </span>
      </td>
    </tr>
  );
}
