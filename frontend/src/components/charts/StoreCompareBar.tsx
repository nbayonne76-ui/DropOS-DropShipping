"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { formatCents } from "@/lib/formatters";
import type { StoreComparison } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface StoreCompareBarProps {
  data: StoreComparison[] | undefined;
  isLoading?: boolean;
  currency?: string;
  height?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-neutral-700 mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill }} className="font-medium">
          {p.name}: {formatCents(p.value ?? 0)}
        </p>
      ))}
    </div>
  );
}

export function StoreCompareBar({
  data,
  isLoading = false,
  currency = "USD",
  height = 300,
}: StoreCompareBarProps) {
  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  if (!data?.length) {
    return (
      <div
        className="flex items-center justify-center text-neutral-400 text-sm"
        style={{ height }}
      >
        No store comparison data available
      </div>
    );
  }

  const chartData = data.map((s) => ({
    name: s.store_name,
    Revenue: s.gross_revenue,
    "Net Revenue": s.net_revenue,
    Profit: s.net_profit,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        barGap={4}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-US", {
              style: "currency",
              currency,
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(v / 100)
          }
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
        />
        <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Net Revenue" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
