import { cn, formatCents, formatMargin } from "@/lib/formatters";
import { COST_LAYER_LABELS, COST_LAYER_COLORS } from "@/lib/constants";
import type { CostBreakdown } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";

interface CostLayerTableProps {
  breakdown: CostBreakdown | undefined;
  isLoading?: boolean;
  currency?: string;
  className?: string;
}

const COST_KEYS: (keyof CostBreakdown)[] = [
  "cogs",
  "shipping_cost",
  "platform_fee",
  "payment_fee",
  "chargeback_fee",
  "refund_fee",
  "fx_loss",
  "import_duty",
];

export function CostLayerTable({
  breakdown,
  isLoading = false,
  currency = "USD",
  className,
}: CostLayerTableProps) {
  const totalCost = breakdown?.total ?? 0;

  return (
    <div className={cn("overflow-hidden", className)}>
      <table className="min-w-full">
        <thead>
          <tr className="border-b border-neutral-100">
            <th className="pb-2 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Cost Layer
            </th>
            <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Amount
            </th>
            <th className="pb-2 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              % of Costs
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-2.5"><Skeleton className="h-4 w-32" /></td>
                  <td className="py-2.5 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                  <td className="py-2.5 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                </tr>
              ))
            : COST_KEYS.map((key) => {
                const amount = breakdown ? (breakdown[key] as number) : 0;
                const pct = totalCost > 0 ? (amount / totalCost) * 100 : 0;
                const color = COST_LAYER_COLORS[key] ?? "#94a3b8";

                return (
                  <tr key={key} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-neutral-700">
                          {COST_LAYER_LABELS[key] ?? key}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-sm font-medium text-neutral-800 tabular-nums">
                      {formatCents(amount, currency)}
                    </td>
                    <td className="py-2.5 text-right text-sm text-neutral-500 tabular-nums">
                      {formatMargin(pct / 100)}
                    </td>
                  </tr>
                );
              })}
        </tbody>
        {!isLoading && breakdown && (
          <tfoot>
            <tr className="border-t border-neutral-200">
              <td className="pt-3 text-sm font-semibold text-neutral-900">Total Costs</td>
              <td className="pt-3 text-right text-sm font-semibold text-neutral-900 tabular-nums">
                {formatCents(totalCost, currency)}
              </td>
              <td className="pt-3 text-right text-sm font-semibold text-neutral-700 tabular-nums">
                {formatMargin(totalCost > 0 ? 1 : 0)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
