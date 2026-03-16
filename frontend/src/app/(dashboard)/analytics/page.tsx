"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/analytics/KPICard";
import { CostLayerTable } from "@/components/analytics/CostLayerTable";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { CostBreakdownPie } from "@/components/charts/CostBreakdownPie";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Card } from "@/components/ui/Card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDateRange } from "@/hooks/useDateRange";
import { formatCents, formatMargin, formatNumber } from "@/lib/formatters";

export default function AnalyticsPage() {
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useAnalytics();

  const summary = data?.summary;
  const breakdown = data?.cost_breakdown;
  const trend = data?.trend;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Profit, costs, and trends across all stores"
        action={
          <DateRangePicker
            value={range}
            preset={preset}
            onPresetChange={setPreset}
            onRangeChange={setCustomRange}
          />
        }
      />

      {/* KPIs */}
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
    </div>
  );
}
