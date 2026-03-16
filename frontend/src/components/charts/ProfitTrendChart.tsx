"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { format, parseISO } from "date-fns";
import { formatCents } from "@/lib/formatters";
import type { TrendPoint } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProfitTrendChartProps {
  data: TrendPoint[] | undefined;
  isLoading?: boolean;
  currency?: string;
  height?: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  const revenue = payload.find((p) => p.dataKey === "revenue_cents");
  const profit = payload.find((p) => p.dataKey === "profit_cents");

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-neutral-700 mb-2">
        {label}
      </p>
      {revenue && (
        <p className="text-primary-600">
          Revenue: {formatCents(revenue.value ?? 0)}
        </p>
      )}
      {profit && (
        <p className={(profit.value ?? 0) >= 0 ? "text-success-600" : "text-danger-600"}>
          Profit: {formatCents(profit.value ?? 0)}
        </p>
      )}
    </div>
  );
}

export function ProfitTrendChart({
  data,
  isLoading = false,
  currency = "USD",
  height = 300,
}: ProfitTrendChartProps) {
  if (isLoading) {
    return <Skeleton className="w-full" style={{ height }} />;
  }

  if (!data?.length) {
    return (
      <div
        className="flex items-center justify-center text-neutral-400 text-sm"
        style={{ height }}
      >
        No trend data available
      </div>
    );
  }

  const chartData = data.map((point) => ({
    ...point,
    label: (() => {
      try {
        return format(parseISO(point.date), "MMM d");
      } catch {
        return point.date;
      }
    })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
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
          formatter={(value) => (value === "revenue_cents" ? "Revenue" : "Net Profit")}
        />
        <Line
          type="monotone"
          dataKey="revenue_cents"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="revenue_cents"
        />
        <Line
          type="monotone"
          dataKey="profit_cents"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="profit_cents"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
