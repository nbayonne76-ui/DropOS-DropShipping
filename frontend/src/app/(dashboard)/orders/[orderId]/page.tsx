"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OrderCostDetail } from "@/components/orders/OrderCostDetail";
import { getOrder, recalculateOrderProfit } from "@/lib/api/orders";
import { formatCents, formatDate, formatMargin } from "@/lib/formatters";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import type { Order } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = use(params);
  const [recalculating, setRecalculating] = useState(false);

  const {
    data: order,
    isLoading,
    mutate,
  } = useSWR<Order>(
    `/orders/${orderId}`,
    () => getOrder(orderId),
    { revalidateOnFocus: false }
  );

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const updated = await recalculateOrderProfit(orderId);
      await mutate(updated);
    } finally {
      setRecalculating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-neutral-500">Order not found.</p>
        <Link href="/dashboard/orders" className="text-primary-600 text-sm mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          All Orders
        </Link>
        <PageHeader
          title={`Order #${order.order_number}`}
          subtitle={`Placed ${formatDate(order.ordered_at)} · ${order.customer_email}`}
          action={
            <div className="flex items-center gap-2">
              <Badge variant={ORDER_STATUS_COLORS[order.status]} dot>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                loading={recalculating}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleRecalculate}
              >
                Recalculate
              </Button>
            </div>
          }
        />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Gross Revenue
          </p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums">
            {formatCents(order.gross_revenue_cents, order.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Total Costs
          </p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums">
            {formatCents(
              order.gross_revenue_cents - order.net_profit_cents,
              order.currency
            )}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Net Profit
          </p>
          <p
            className={`text-xl font-bold tabular-nums ${
              order.net_profit_cents >= 0 ? "text-success-600" : "text-danger-600"
            }`}
          >
            {order.net_profit_cents >= 0 ? "+" : ""}
            {formatCents(order.net_profit_cents, order.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Profit Margin
          </p>
          <p
            className={`text-xl font-bold tabular-nums ${
              order.profit_margin >= 0 ? "text-success-600" : "text-danger-600"
            }`}
          >
            {formatMargin(order.profit_margin / 100)}
          </p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <Card title="Cost Breakdown" subtitle="Edit any cost layer inline — profit recalculates automatically">
        <OrderCostDetail
          order={order}
          onUpdate={(updated) => mutate(updated)}
          defaultExpanded
        />
      </Card>

      {/* Line Items */}
      {order.line_items.length > 0 && (
        <Card title="Line Items">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Product</th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Qty</th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Unit Price</th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {order.line_items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-50/50">
                  <td className="py-2.5">
                    <p className="font-medium text-neutral-800">{item.product_title}</p>
                    {item.variant_title && (
                      <p className="text-xs text-neutral-400">{item.variant_title}</p>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-neutral-600 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right text-neutral-700 tabular-nums">
                    {formatCents(item.unit_price_cents, order.currency)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-neutral-800 tabular-nums">
                    {formatCents(item.total_price_cents, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
