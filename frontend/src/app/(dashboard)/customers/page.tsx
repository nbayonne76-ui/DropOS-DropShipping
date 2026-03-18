"use client";

import { useState } from "react";
import { Download, Users, TrendingUp, ShoppingBag, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCustomers } from "@/hooks/useCustomers";
import { useDateRange } from "@/hooks/useDateRange";
import { useAppStore } from "@/store/appStore";
import { exportOrdersCsv } from "@/lib/api/analytics";
import { downloadBlob, formatCents, formatNumber } from "@/lib/formatters";
import { format, parseISO } from "date-fns";
import type { CustomerAnalytics } from "@/types/api";

export default function CustomersPage() {
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { customers, isLoading } = useCustomers({ limit: 100 });
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportOrdersCsv({
        store_id: activeStoreId ?? undefined,
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
      });
      downloadBlob(blob, `orders-${format(range.from, "yyyy-MM-dd")}-${format(range.to, "yyyy-MM-dd")}.csv`);
    } finally {
      setExporting(false);
    }
  }

  const filtered = customers?.filter((c) =>
    !search || c.customer_email.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const totalRevenue = filtered.reduce((s, c) => s + c.total_gross_revenue, 0);
  const totalProfit = filtered.reduce((s, c) => s + c.total_net_profit, 0);
  const totalOrders = filtered.reduce((s, c) => s + c.order_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Intelligence"
        subtitle="Lifetime value and purchase history by customer"
        action={
          <div className="flex items-center gap-2">
            <DateRangePicker
              value={range}
              preset={preset}
              onPresetChange={setPreset}
              onRangeChange={setCustomRange}
            />
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExport}
            >
              Export Orders
            </Button>
          </div>
        }
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                Customers
              </div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatNumber(filtered.length)}
              </p>
            </>
          )}
        </Card>
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                Total Orders
              </div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatNumber(totalOrders)}
              </p>
            </>
          )}
        </Card>
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Total Revenue
              </div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCents(totalRevenue)}
              </p>
            </>
          )}
        </Card>
        <Card className="p-4">
          {isLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                <RefreshCw className="w-3.5 h-3.5" />
                Net Profit
              </div>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCents(totalProfit)}
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Search + Table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <input
            type="text"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm text-sm bg-transparent outline-none text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Gross Revenue</th>
                <th className="px-4 py-3 text-right">Net Profit</th>
                <th className="px-4 py-3 text-right">Avg Order</th>
                <th className="px-4 py-3 text-right">Refunds</th>
                <th className="px-4 py-3 text-right">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-zinc-400 text-sm">
                    No customers found for this period.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => <CustomerRow key={c.customer_email} customer={c} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CustomerRow({ customer: c }: { customer: CustomerAnalytics }) {
  const profitColor =
    c.total_net_profit > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : c.total_net_profit < 0
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-500";

  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{c.customer_email}</span>
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
        {c.order_count}
      </td>
      <td className="px-4 py-3 text-right text-zinc-800 dark:text-zinc-200">
        {formatCents(c.total_gross_revenue)}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${profitColor}`}>
        {formatCents(c.total_net_profit)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
        {formatCents(c.avg_order_value)}
      </td>
      <td className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400">
        {c.total_refunds > 0 ? formatCents(c.total_refunds) : "—"}
      </td>
      <td className="px-4 py-3 text-right text-zinc-500 text-xs">
        {format(parseISO(c.last_ordered_at), "MMM d, yyyy")}
      </td>
    </tr>
  );
}
