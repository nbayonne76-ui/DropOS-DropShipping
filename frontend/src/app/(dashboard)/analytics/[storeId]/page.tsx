"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/analytics/KPICard";
import { CostLayerTable } from "@/components/analytics/CostLayerTable";
import { ProfitTrendChart } from "@/components/charts/ProfitTrendChart";
import { CostBreakdownPie } from "@/components/charts/CostBreakdownPie";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { Card } from "@/components/ui/Card";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useDateRange } from "@/hooks/useDateRange";
import { useStores } from "@/hooks/useStores";
import { formatCents, formatMargin, formatNumber } from "@/lib/formatters";

interface StoreAnalyticsPageProps {
  params: Promise<{ storeId: string }>;
}

export default function StoreAnalyticsPage({ params }: StoreAnalyticsPageProps) {
  const { storeId } = use(params);
  const { range, preset, setPreset, setCustomRange } = useDateRange();
  const { data, isLoading } = useAnalytics({ storeId });
  const { stores } = useStores();

  const store = stores.find((s) => s.id === storeId);
  const summary = data?.summary;
  const breakdown = data?.cost_breakdown;
  const trend = data?.trend;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/analytics"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          All Analytics
        </Link>
        <PageHeader
          title={store?.name ?? "Store Analytics"}
          subtitle={store?.domain ?? `Store ID: ${storeId}`}
          action={
            <DateRangePicker
              value={range}
              preset={preset}
              onPresetChange={setPreset}
              onRangeChange={setCustomRange}
            />
          }
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Revenue"
          value={summary ? formatCents(summary.total_revenue_cents, store?.currency) : "—"}
          changePct={summary?.revenue_change_pct}
          isLoading={isLoading}
        />
        <KPICard
          title="Net Profit"
          value={summary ? formatCents(summary.total_profit_cents, store?.currency) : "—"}
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

      {/* Profit Trend */}
      <Card title="Profit Trend" subtitle={`Revenue vs net profit — ${store?.name ?? "this store"}`}>
        <ProfitTrendChart
          data={trend}
          isLoading={isLoading}
          currency={store?.currency}
          height={300}
        />
      </Card>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cost Breakdown" subtitle="Costs as a share of revenue">
          <CostBreakdownPie
            breakdown={breakdown}
            isLoading={isLoading}
            currency={store?.currency}
          />
        </Card>
        <Card title="Cost Layer Detail" subtitle="Detailed amounts per cost layer">
          <CostLayerTable
            breakdown={breakdown}
            isLoading={isLoading}
            currency={store?.currency}
          />
        </Card>
      </div>
    </div>
  );
}
