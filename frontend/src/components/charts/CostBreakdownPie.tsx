"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { formatCents, formatMargin } from "@/lib/formatters";
import { COST_LAYER_LABELS, COST_LAYER_COLORS } from "@/lib/constants";
import type { CostBreakdown } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface CostBreakdownPieProps {
  breakdown: CostBreakdown | undefined;
  isLoading?: boolean;
  currency?: string;
  height?: number;
}

const COST_KEYS = [
  "cogs",
  "shipping_cost",
  "platform_fee",
  "payment_fee",
  "chargeback_fee",
  "refund_fee",
  "fx_loss",
  "import_duty",
] as const;

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-neutral-700">{name}</p>
      <p className="text-neutral-600">{formatCents(value ?? 0)}</p>
      <p className="text-neutral-400">{data.pct?.toFixed(1)}% of costs</p>
    </div>
  );
}

export function CostBreakdownPie({
  breakdown,
  isLoading = false,
  currency = "USD",
  height = 280,
}: CostBreakdownPieProps) {
  if (isLoading) {
    return <Skeleton className="w-full rounded-full" style={{ height }} />;
  }

  if (!breakdown) {
    return (
      <div
        className="flex items-center justify-center text-neutral-400 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const totalCost = breakdown.total || 1;
  const slices = COST_KEYS.map((key) => {
    const value = breakdown[key] as number;
    return {
      key,
      name: COST_LAYER_LABELS[key] ?? key,
      value,
      pct: (value / totalCost) * 100,
      color: COST_LAYER_COLORS[key] ?? "#94a3b8",
    };
  }).filter((s) => s.value > 0);

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex-shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {slices.map((slice) => (
                <Cell key={slice.key} fill={slice.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((slice) => (
          <div key={slice.key} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <span className="text-xs text-neutral-600 flex-1 truncate">{slice.name}</span>
            <span className="text-xs font-medium text-neutral-800 tabular-nums">
              {formatCents(slice.value, currency)}
            </span>
            <span className="text-xs text-neutral-400 tabular-nums w-10 text-right">
              {formatMargin(slice.pct / 100)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
