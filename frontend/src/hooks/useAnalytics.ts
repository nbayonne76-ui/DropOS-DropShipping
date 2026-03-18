import useSWR from "swr";
import { getAnalyticsSummary, getProfitTrend, getCostBreakdown, getStoreComparisons } from "@/lib/api/analytics";
import { useAppStore } from "@/store/appStore";
import type { AnalyticsSummaryResponse, TrendPoint, CostBreakdown, StoreComparison } from "@/types/api";
import type { Granularity } from "@/types/analytics";
import { format } from "date-fns";

interface UseAnalyticsOptions {
  storeId?: string;
  granularity?: Granularity;
}

interface UseAnalyticsResult {
  summary: AnalyticsSummaryResponse | undefined;
  trend: TrendPoint[] | undefined;
  breakdown: CostBreakdown | undefined;
  comparisons: StoreComparison[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsResult {
  const dateRange = useAppStore((s) => s.dateRange);
  const activeStoreId = useAppStore((s) => s.activeStoreId);

  const storeId = options.storeId ?? activeStoreId ?? undefined;
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");
  const granularity = options.granularity ?? "day";

  const params = { store_id: storeId, from, to, granularity };

  const { data: summary, error: e1, isLoading: l1 } = useSWR(
    ["analytics/summary", storeId, from, to],
    () => getAnalyticsSummary(params),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const { data: trend, error: e2, isLoading: l2 } = useSWR(
    ["analytics/trends", storeId, from, to, granularity],
    () => getProfitTrend(params),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const { data: breakdown, error: e3, isLoading: l3 } = useSWR(
    ["analytics/costs", storeId, from, to],
    () => getCostBreakdown(params),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const { data: comparisons, error: e4, isLoading: l4 } = useSWR(
    ["analytics/comparisons", from, to],
    () => getStoreComparisons({ from, to }),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  return {
    summary,
    trend,
    breakdown,
    comparisons,
    isLoading: l1 || l2 || l3 || l4,
    isError: !!(e1 || e2 || e3 || e4),
  };
}
