import useSWR from "swr";
import { getTopProducts } from "@/lib/api/analytics";
import { useAppStore } from "@/store/appStore";
import type { TopProduct } from "@/types/api";
import { format } from "date-fns";

interface UseTopProductsOptions {
  storeId?: string;
  limit?: number;
}

interface UseTopProductsResult {
  topProducts: TopProduct[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useTopProducts(options: UseTopProductsOptions = {}): UseTopProductsResult {
  const dateRange = useAppStore((s) => s.dateRange);
  const activeStoreId = useAppStore((s) => s.activeStoreId);

  const storeId = options.storeId ?? activeStoreId ?? undefined;
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");
  const limit = options.limit ?? 10;

  const { data: topProducts, error, isLoading } = useSWR(
    ["analytics/top-products", storeId, from, to, limit],
    () => getTopProducts({ store_id: storeId, from, to, limit }),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    topProducts,
    isLoading,
    isError: !!error,
  };
}
