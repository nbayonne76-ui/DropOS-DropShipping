import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/Skeleton";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  changePct?: number;
  isLoading?: boolean;
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  changePct,
  isLoading = false,
  className,
}: KPICardProps) {
  const isPositive = changePct !== undefined && changePct > 0;
  const isNegative = changePct !== undefined && changePct < 0;

  return (
    <div className={cn("bg-white rounded-xl border border-neutral-200 p-5 shadow-sm", className)}>
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
        {title}
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-neutral-900 tabular-nums leading-none mb-1">
            {value}
          </p>

          {subtitle && (
            <p className="text-xs text-neutral-400">{subtitle}</p>
          )}

          {changePct !== undefined && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                isPositive && "text-success-600",
                isNegative && "text-danger-600",
                !isPositive && !isNegative && "text-neutral-400"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : isNegative ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {isPositive && "+"}
              {changePct.toFixed(1)}%
              <span className="text-neutral-400 font-normal">vs prev. period</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
