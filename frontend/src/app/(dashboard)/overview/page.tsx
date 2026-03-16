"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/analytics/KPICard";
import { StoreCompareBar } from "@/components/charts/StoreCompareBar";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Card } from "@/components/ui/Card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDateRange } from "@/hooks/useDateRange";
import { formatCents, formatMargin, formatNumber } from "@/lib/formatters";

export default function OverviewPage() {
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useAnalytics();

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        subtitle="Multi-store performance at a glance"
        action={
          <DateRangePicker
            value={range}
            preset={preset}
            onPresetChange={setPreset}
            onRangeChange={setCustomRange}
          />
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={summary ? formatCents(summary.total_revenue_cents) : "—"}
          changePct={summary?.revenue_change_pct}
          isLoading={isLoading}
        />
        <KPICard
          title="Net Profit"
          value={summary ? formatCents(summary.total_profit_cents) : "—"}
          changePct={summary?.profit_change_pct}
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Margin"
          value={summary ? formatMargin(summary.avg_margin / 100) : "—"}
          changePct={summary?.margin_change_pct}
          isLoading={isLoading}
        />
        <KPICard
          title="Orders"
          value={summary ? formatNumber(summary.orders_count) : "—"}
          changePct={summary?.orders_change_pct}
          isLoading={isLoading}
        />
      </div>

      {/* Store Comparison Chart */}
      <Card
        title="Store Comparison"
        subtitle="Revenue, cost, and profit by store"
      >
        <StoreCompareBar
          data={data?.store_comparisons}
          isLoading={isLoading}
          height={320}
        />
      </Card>
    </div>
  );
}
