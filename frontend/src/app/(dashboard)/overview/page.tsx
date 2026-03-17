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
          value={data ? formatCents(data.gross_revenue) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Net Profit"
          value={data ? formatCents(data.net_profit) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Avg Margin"
          value={data ? formatMargin(parseFloat(data.avg_profit_margin)) : "—"}
          isLoading={isLoading}
        />
        <KPICard
          title="Orders"
          value={data ? formatNumber(data.total_orders) : "—"}
          isLoading={isLoading}
        />
      </div>

      {/* Store Comparison Chart */}
      <Card
        title="Store Comparison"
        subtitle="Revenue, cost, and profit by store"
      >
        <StoreCompareBar
          data={undefined}
          isLoading={isLoading}
          height={320}
        />
      </Card>
    </div>
  );
}
