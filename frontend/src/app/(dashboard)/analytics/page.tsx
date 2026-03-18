"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/analytics/KPICard";
import { CostLayerTable } from "@/components/analytics/CostLayerTable";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { CostBreakdownPie } from "@/components/charts/CostBreakdownPie";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useTopProducts } from "@/hooks/useTopProducts";
import { useDateRange } from "@/hooks/useDateRange";
import { exportAnalyticsCsv } from "@/lib/api/analytics";
import { useAppStore } from "@/store/appStore";
import { downloadBlob, formatCents, formatMargin, formatNumber } from "@/lib/formatters";
import { format } from "date-fns";

export default function AnalyticsPage() {
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { summary, trend, breakdown, isLoading } = useAnalytics();
  const { topProducts, isLoading: topLoading } = useTopProducts({ limit: 10 });
  const activeStoreId = useAppStore((s) => s.activeStoreId);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAnalyticsCsv({
        store_id: activeStoreId ?? undefined,
        from: format(range.from, "yyyy-MM-dd"),
        to: format(range.to, "yyyy-MM-dd"),
        granularity: "day",
      });
      downloadBlob(blob, `analytics-${format(range.from, "yyyy-MM-dd")}-${format(range.to, "yyyy-MM-dd")}.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Profit, costs, and trends across all stores"
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
              Export CSV
            </Button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={summary ? formatCents(summary.gross_revenue) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Net Profit"
          value={summary ? formatCents(summary.net_profit) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Margin"
          value={summary ? formatMargin(parseFloat(summary.avg_profit_margin)) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Orders"
          value={summary ? formatNumber(summary.total_orders) : "—"}
          isLoading={isLoading}
        />
      </div>

      {/* Refund KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <KPICard
          title="Total Refunded"
          value={summary ? formatCents(summary.total_refunds) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Refund Rate"
          value={summary ? summary.refund_rate : "—"}
          isLoading={isLoading}
        />
      </div>

      {/* Profit Trend Chart */}
      <Card title="Profit Trend" subtitle="Revenue vs net profit over time">
        <ProfitTrendChart data={trend} isLoading={isLoading} height={300} />
      </Card>

      {/* Cost Breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cost Breakdown" subtitle="Costs as a share of revenue">
          <CostBreakdownPie breakdown={breakdown} isLoading={isLoading} />
        </Card>
        <Card title="Cost Layer Detail" subtitle="Detailed amounts per cost layer">
          <CostLayerTable breakdown={breakdown} isLoading={isLoading} />
        </Card>
      </div>

      {/* Top Products */}
      <Card title="Top Products" subtitle="Best performers by net profit in the selected period">
        <div className="overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Product
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Units Sold
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Gross Revenue
                </th>
                <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  Net Profit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {topLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-2.5"><Skeleton className="h-4 w-48" /></td>
                      <td className="py-2.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="py-2.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="py-2.5 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    </tr>
                  ))
                : (topProducts ?? []).map((p, i) => (
                    <tr key={p.shopify_product_id ?? i} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-neutral-400 w-5 tabular-nums">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm text-neutral-800 font-medium">{p.title}</p>
                            {p.sku && (
                              <p className="text-xs text-neutral-400">{p.sku}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right text-sm text-neutral-600 tabular-nums">
                        {formatNumber(p.units_sold)}
                      </td>
                      <td className="py-2.5 text-right text-sm text-neutral-700 tabular-nums">
                        {formatCents(p.gross_revenue)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <Badge variant={p.net_profit >= 0 ? "success" : "danger"}>
                          {p.net_profit >= 0 ? "+" : ""}{formatCents(p.net_profit)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              {!topLoading && (topProducts ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-neutral-400">
                    No product data for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
