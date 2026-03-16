import { cn } from "@/lib/formatters";
import type { SupplierPerformance } from "@/types/api";
import { TrendingUp, Package, AlertTriangle, Clock } from "lucide-react";

interface SupplierScoreCardProps {
  performance: SupplierPerformance;
  onClick?: () => void;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-success-600"
      : score >= 60
      ? "text-warning-600"
      : "text-danger-600";

  const bgColor =
    score >= 80
      ? "bg-success-50"
      : score >= 60
      ? "bg-warning-50"
      : "bg-danger-50";

  return (
    <div
      className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0",
        bgColor
      )}
    >
      <span className={cn("text-xl font-bold tabular-nums leading-none", color)}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function MetricRow({
  icon: Icon,
  label,
  value,
  suffix = "",
  colorize = false,
  higherIsBetter = true,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  colorize?: boolean;
  higherIsBetter?: boolean;
}) {
  const positive = higherIsBetter ? value >= 70 : value <= 5;
  const textColor = colorize
    ? positive
      ? "text-success-600"
      : "text-danger-600"
    : "text-neutral-800";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <span className={cn("text-xs font-semibold tabular-nums", textColor)}>
        {value.toFixed(1)}{suffix}
      </span>
    </div>
  );
}

export function SupplierScoreCard({ performance, onClick }: SupplierScoreCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl border border-neutral-200 p-5 shadow-sm transition-shadow",
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start gap-4">
        <ScoreRing score={performance.composite_score} />

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-neutral-900 truncate">
            {performance.supplier_name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5 mb-3">
            <span className="text-xs text-neutral-400">{performance.country}</span>
            <span className="text-neutral-200">·</span>
            <span className="text-xs text-neutral-400">
              {performance.total_orders.toLocaleString()} orders
            </span>
          </div>

          <div className="space-y-1.5">
            <MetricRow
              icon={TrendingUp}
              label="On-time delivery"
              value={performance.on_time_rate}
              suffix="%"
              colorize
              higherIsBetter
            />
            <MetricRow
              icon={Package}
              label="Stock accuracy"
              value={performance.stock_accuracy}
              suffix="%"
              colorize
              higherIsBetter
            />
            <MetricRow
              icon={AlertTriangle}
              label="Dispute rate"
              value={performance.dispute_rate}
              suffix="%"
              colorize
              higherIsBetter={false}
            />
            <MetricRow
              icon={Clock}
              label="Avg. fulfillment"
              value={performance.avg_fulfillment_days}
              suffix="d"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
