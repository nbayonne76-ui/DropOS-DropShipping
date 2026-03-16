"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Badge } from "@/components/ui/Badge";
import { OrderRow } from "@/components/orders/OrderRow";
import { useOrders } from "@/hooks/useOrders";
import { useStores } from "@/hooks/useStores";
import { useDateRange } from "@/hooks/useDateRange";
import { format } from "date-fns";
import type { OrderStatus } from "@/types/api";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";

const STATUS_OPTIONS: (OrderStatus | "all")[] = [
  "all", "pending", "paid", "fulfilled", "refunded", "cancelled",
];

export default function OrdersPage() {
  const router = useRouter();
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { stores } = useStores();

  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data, orders, isLoading } = useOrders({
    store_id: storeFilter !== "all" ? storeFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    from: format(range.from, "yyyy-MM-dd"),
    to: format(range.to, "yyyy-MM-dd"),
    page,
    page_size: 25,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        subtitle={`${data?.total ?? 0} orders in period`}
        action={
          <DateRangePicker
            value={range}
            preset={preset}
            onPresetChange={setPreset}
            onRangeChange={setCustomRange}
          />
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Store filter */}
        <select
          value={storeFilter}
          onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
          className="input-base w-auto text-sm"
        >
          <option value="all">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-1">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setPage(1); }}
              className={
                statusFilter === status
                  ? "px-3 py-1 rounded-md text-xs font-medium bg-primary-600 text-white"
                  : "px-3 py-1 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              }
            >
              {status === "all" ? "All" : ORDER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        <table className="min-w-full">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Order</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Revenue</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Net Profit</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Margin</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-100">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-neutral-200 rounded animate-pulse" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <ShoppingCart className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500">No orders found</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                />
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-500">
              Page {data.page} of {data.total_pages} ({data.total} orders)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
