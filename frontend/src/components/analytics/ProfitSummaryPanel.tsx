import { ArrowDown } from "lucide-react";
import { cn, formatCents, formatMargin } from "@/lib/formatters";
import type { CostBreakdown, DashboardSummary } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface ProfitSummaryPanelProps {
  summary: DashboardSummary | undefined;
  breakdown: CostBreakdown | undefined;
  isLoading?: boolean;
  currency?: string;
  className?: string;
}

interface WaterfallRow {
  label: string;
  amount: number;
  type: "revenue" | "cost" | "profit";
  isTotal?: boolean;
}

export function ProfitSummaryPanel({
  summary,
  breakdown,
  isLoading = false,
  currency = "USD",
  className,
}: ProfitSummaryPanelProps) {
  const rows: WaterfallRow[] = summary && breakdown
    ? [
        { label: "Gross Revenue", amount: summary.total_revenue_cents, type: "revenue", isTotal: true },
        { label: "Supplier Costs", amount: breakdown.supplier_cost_cents, type: "cost" },
        { label: "Platform Fees", amount: breakdown.platform_fee_cents, type: "cost" },
        { label: "Payment Fees", amount: breakdown.payment_fee_cents, type: "cost" },
        { label: "Shipping Costs", amount: breakdown.shipping_cost_cents, type: "cost" },
        { label: "Return Costs", amount: breakdown.return_cost_cents, type: "cost" },
        { label: "Ad Spend", amount: breakdown.ad_spend_cents, type: "cost" },
        { label: "Customs & Duties", amount: breakdown.customs_duty_cents, type: "cost" },
        { label: "Other Costs", amount: breakdown.other_cost_cents, type: "cost" },
        { label: "Net Profit", amount: summary.total_profit_cents, type: "profit", isTotal: true },
      ]
    : [];

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!summary || !breakdown) {
    return (
      <p className="text-sm text-neutral-400 text-center py-4">No data available</p>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {rows.map((row, idx) => {
        const isRevenue = row.type === "revenue";
        const isCost = row.type === "cost";
        const isProfit = row.type === "profit";
        const profitPositive = row.amount >= 0;

        return (
          <div key={row.label}>
            {isCost && idx > 0 && rows[idx - 1]?.type !== "cost" && (
              <div className="flex justify-center my-2">
                <ArrowDown className="w-4 h-4 text-neutral-300" />
              </div>
            )}
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg",
                isRevenue && "bg-primary-50",
                isCost && "hover:bg-neutral-50",
                isProfit && (profitPositive ? "bg-success-50" : "bg-danger-50"),
                row.isTotal && "font-semibold"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  isRevenue && "text-primary-700",
                  isCost && "text-neutral-600",
                  isProfit && (profitPositive ? "text-success-700" : "text-danger-700")
                )}
              >
                {isCost && "− "}
                {row.label}
              </span>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  isRevenue && "font-semibold text-primary-700",
                  isCost && "text-neutral-700",
                  isProfit && (profitPositive ? "font-semibold text-success-700" : "font-semibold text-danger-700")
                )}
              >
                {isCost && row.amount > 0 && "−"}
                {formatCents(Math.abs(row.amount), currency)}
              </span>
            </div>
            {isProfit && (
              <p className="text-xs text-center text-neutral-400 mt-1">
                Margin: {formatMargin(summary.avg_margin / 100)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
