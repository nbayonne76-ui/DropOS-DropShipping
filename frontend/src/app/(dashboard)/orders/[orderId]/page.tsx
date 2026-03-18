"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Truck, RotateCcw, Plus, X } from "lucide-react";
import useSWR from "swr";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { OrderCostDetail } from "@/components/orders/OrderCostDetail";
import { getOrder, recalculateOrderProfit, fulfillOrder } from "@/lib/api/orders";
import { listOrderRefunds } from "@/lib/api/refunds";
import { listReturns, createReturn, updateReturn } from "@/lib/api/returns";
import { formatCents, formatDate, formatMargin } from "@/lib/formatters";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  FULFILLMENT_STATUS_LABELS,
  FULFILLMENT_STATUS_COLORS,
} from "@/lib/constants";
import type {
  FulfillOrderRequest,
  Order,
  Refund,
  ReturnRequest,
  ReturnReason,
  ReturnStatus,
} from "@/types/api";

const REASON_LABELS: Record<ReturnReason, string> = {
  defective: "Defective",
  wrong_item: "Wrong Item",
  not_as_described: "Not as Described",
  changed_mind: "Changed Mind",
  damaged_in_transit: "Damaged in Transit",
  other: "Other",
};

const RETURN_STATUS_VARIANT: Record<ReturnStatus, "neutral" | "warning" | "info" | "success" | "danger"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  completed: "success",
};

interface OrderDetailPageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderId } = use(params);
  const [recalculating, setRecalculating] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [showFulfillForm, setShowFulfillForm] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCompany, setTrackingCompany] = useState("");
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState<ReturnReason>("defective");
  const [returnNotes, setReturnNotes] = useState("");
  const [returnTitle, setReturnTitle] = useState("");
  const [returnQty, setReturnQty] = useState(1);
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const {
    data: order,
    isLoading,
    mutate,
  } = useSWR<Order>(
    `/orders/${orderId}`,
    () => getOrder(orderId),
    { revalidateOnFocus: false }
  );

  const { data: refunds = [] } = useSWR<Refund[]>(
    `/orders/${orderId}/refunds`,
    () => listOrderRefunds(orderId),
    { revalidateOnFocus: false }
  );

  const {
    data: returnRequests = [],
    mutate: mutateReturns,
  } = useSWR<ReturnRequest[]>(
    `/orders/${orderId}/returns`,
    () => listReturns({ order_id: orderId }),
    { revalidateOnFocus: false }
  );

  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnTitle.trim()) return;
    setSubmittingReturn(true);
    try {
      const rr = await createReturn({
        order_id: orderId,
        reason: returnReason,
        notes: returnNotes.trim() || null,
        items: [{ title: returnTitle.trim(), quantity: returnQty }],
      });
      await mutateReturns([rr, ...returnRequests]);
      setShowReturnForm(false);
      setReturnTitle("");
      setReturnNotes("");
      setReturnQty(1);
      setReturnReason("defective");
    } finally {
      setSubmittingReturn(false);
    }
  }

  async function handleReturnTransition(rr: ReturnRequest, status: ReturnStatus) {
    const updated = await updateReturn(rr.id, { status });
    await mutateReturns(returnRequests.map((r) => (r.id === updated.id ? updated : r)));
  }

  async function handleFulfill() {
    setFulfilling(true);
    try {
      const req: FulfillOrderRequest = {
        tracking_number: trackingNumber || null,
        tracking_company: trackingCompany || null,
        notify_customer: true,
      };
      const updated = await fulfillOrder(orderId, req);
      await mutate(updated);
      setShowFulfillForm(false);
    } finally {
      setFulfilling(false);
    }
  }

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
        <Link href="/orders" className="text-primary-600 text-sm mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          All Orders
        </Link>
        <PageHeader
          title={`Order ${order.order_number}`}
          subtitle={`Placed ${formatDate(order.ordered_at)}${order.customer_email ? ` · ${order.customer_email}` : ""}`}
          action={
            <div className="flex items-center gap-2">
              <Badge variant={ORDER_STATUS_COLORS[order.status]} dot>
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              <Badge variant={FULFILLMENT_STATUS_COLORS[order.fulfillment_status]} dot>
                {FULFILLMENT_STATUS_LABELS[order.fulfillment_status]}
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
              {order.fulfillment_status !== "fulfilled" && (
                <Button
                  size="sm"
                  leftIcon={<Truck className="w-3.5 h-3.5" />}
                  onClick={() => setShowFulfillForm((v) => !v)}
                >
                  Fulfill
                </Button>
              )}
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
            {formatCents(order.gross_revenue, order.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Total Costs
          </p>
          <p className="text-xl font-bold text-neutral-900 tabular-nums">
            {formatCents(order.total_cost, order.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Net Profit
          </p>
          <p
            className={`text-xl font-bold tabular-nums ${
              order.net_profit >= 0 ? "text-success-600" : "text-danger-600"
            }`}
          >
            {order.net_profit >= 0 ? "+" : ""}
            {formatCents(order.net_profit, order.currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">
            Profit Margin
          </p>
          <p
            className={`text-xl font-bold tabular-nums ${
              parseFloat(order.profit_margin) >= 0 ? "text-success-600" : "text-danger-600"
            }`}
          >
            {formatMargin(parseFloat(order.profit_margin))}
          </p>
        </div>
      </div>

      {/* Fulfill form */}
      {showFulfillForm && order.fulfillment_status !== "fulfilled" && (
        <Card title="Fulfill Order" subtitle="Optionally add tracking info before marking as fulfilled">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Tracking number (optional)"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="input-base flex-1 text-sm"
            />
            <input
              type="text"
              placeholder="Carrier (e.g. DHL, FedEx)"
              value={trackingCompany}
              onChange={(e) => setTrackingCompany(e.target.value)}
              className="input-base flex-1 text-sm"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" loading={fulfilling} onClick={handleFulfill}>
                Confirm Fulfillment
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFulfillForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Tracking info (once fulfilled) */}
      {order.fulfillment_status === "fulfilled" && (
        <Card title="Fulfillment">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Fulfilled At</p>
              <p className="text-neutral-800">{order.fulfilled_at ? formatDate(order.fulfilled_at) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Carrier</p>
              <p className="text-neutral-800">{order.tracking_company ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Tracking Number</p>
              <p className="font-mono text-neutral-800">{order.tracking_number ?? "—"}</p>
            </div>
            {order.shopify_fulfillment_id && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-0.5">Shopify Fulfillment ID</p>
                <p className="font-mono text-neutral-500 text-xs">{order.shopify_fulfillment_id}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Cost Breakdown */}
      <Card title="Cost Breakdown" subtitle="Edit any cost layer inline — profit recalculates automatically">
        <OrderCostDetail
          order={order}
          onUpdate={(updated) => mutate(updated)}
          defaultExpanded
        />
      </Card>

      {/* Refunds */}
      {refunds.length > 0 && (
        <Card title="Refunds" subtitle={`${refunds.length} refund${refunds.length > 1 ? "s" : ""} issued`}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Date</th>
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Shopify ID</th>
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Reason</th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-neutral-50/50">
                  <td className="py-2.5 text-neutral-600">
                    {refund.refunded_at ? formatDate(refund.refunded_at) : "—"}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-neutral-400">
                    {refund.shopify_refund_id}
                  </td>
                  <td className="py-2.5 text-neutral-600">
                    {refund.reason ?? refund.note ?? "—"}
                  </td>
                  <td className="py-2.5 text-right font-medium text-danger-600 tabular-nums">
                    -{formatCents(refund.amount, refund.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200">
                <td colSpan={3} className="pt-2.5 text-sm font-semibold text-neutral-700">Total refunded</td>
                <td className="pt-2.5 text-right font-bold text-danger-600 tabular-nums">
                  -{formatCents(refunds.reduce((s, r) => s + r.amount, 0), order.currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}

      {/* Return Requests */}
      <Card
        title="Return Requests"
        subtitle={returnRequests.length > 0 ? `${returnRequests.length} request${returnRequests.length > 1 ? "s" : ""}` : "No returns yet"}
        action={
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowReturnForm((v) => !v)}
          >
            Request Return
          </Button>
        }
      >
        {/* Inline create form */}
        {showReturnForm && (
          <form onSubmit={handleSubmitReturn} className="mb-5 p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-base">Reason <span className="text-danger-500">*</span></label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value as ReturnReason)}
                  className="input-base"
                  required
                >
                  {(Object.keys(REASON_LABELS) as ReturnReason[]).map((r) => (
                    <option key={r} value={r}>{REASON_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-base">Item Title <span className="text-danger-500">*</span></label>
                <input
                  value={returnTitle}
                  onChange={(e) => setReturnTitle(e.target.value)}
                  placeholder="Returned product name"
                  className="input-base"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-base">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={returnQty}
                  onChange={(e) => setReturnQty(Number(e.target.value))}
                  className="input-base"
                />
              </div>
              <div>
                <label className="label-base">Notes</label>
                <input
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Optional context…"
                  className="input-base"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowReturnForm(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
              <Button type="submit" size="sm" loading={submittingReturn}>Submit Return</Button>
            </div>
          </form>
        )}

        {returnRequests.length === 0 && !showReturnForm ? (
          <div className="flex items-center gap-2 text-sm text-neutral-400 py-2">
            <RotateCcw className="w-4 h-4" />
            No return requests for this order.
          </div>
        ) : (
          <div className="space-y-2">
            {returnRequests.map((rr) => (
              <div
                key={rr.id}
                className="flex items-center justify-between gap-4 py-2.5 border-b border-neutral-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={RETURN_STATUS_VARIANT[rr.status]}>{rr.status}</Badge>
                    <span className="text-sm text-neutral-700 font-medium">
                      {REASON_LABELS[rr.reason]}
                    </span>
                  </div>
                  {rr.notes && (
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{rr.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {rr.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleReturnTransition(rr, "approved")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReturnTransition(rr, "rejected")}
                        className="text-danger-500 hover:text-danger-700 hover:bg-danger-50"
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {rr.status === "approved" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReturnTransition(rr, "completed")}
                    >
                      Mark Completed
                    </Button>
                  )}
                  <Link
                    href="/returns"
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    View all
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
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
                    <p className="font-medium text-neutral-800">{item.title}</p>
                    {item.sku && (
                      <p className="text-xs text-neutral-400">SKU: {item.sku}</p>
                    )}
                  </td>
                  <td className="py-2.5 text-right text-neutral-600 tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right text-neutral-700 tabular-nums">
                    {formatCents(item.unit_price, order.currency)}
                  </td>
                  <td className="py-2.5 text-right font-medium text-neutral-800 tabular-nums">
                    {formatCents(item.unit_price * item.quantity, order.currency)}
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
