import useSWR from "swr";
import { getAnalyticsSummary } from "@/lib/api/analytics";
import { useAppStore } from "@/store/appStore";
import type { AnalyticsSummaryResponse } from "@/types/api";
import type { Granularity } from "@/types/analytics";
import { format } from "date-fns";

interface UseAnalyticsOptions {
  storeId?: string;
  granularity?: Granularity;
}

interface UseAnalyticsResult {
  data: AnalyticsSummaryResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsResult {
  const { dateRange, activeStoreId } = useAppStore((s) => ({
    dateRange: s.dateRange,
    activeStoreId: s.activeStoreId,
  }));

  const storeId = options.storeId ?? activeStoreId ?? undefined;
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");
  const granularity = options.granularity ?? "day";

  const key = ["analytics/summary", storeId, from, to, granularity];

  const { data, error, isLoading, mutate } = useSWR<AnalyticsSummaryResponse>(
    key,
    () => getAnalyticsSummary({ store_id: storeId, from, to, granularity }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    data,
    isLoading,
    isError: !!error,
    mutate,
  };
}
