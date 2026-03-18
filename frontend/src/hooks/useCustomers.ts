import useSWR from "swr";
import { getCustomers } from "@/lib/api/analytics";
import { useAppStore } from "@/store/appStore";
import type { CustomerAnalytics } from "@/types/api";
import { format } from "date-fns";

interface UseCustomersOptions {
  storeId?: string;
  limit?: number;
}

interface UseCustomersResult {
  customers: CustomerAnalytics[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useCustomers(options: UseCustomersOptions = {}): UseCustomersResult {
  const dateRange = useAppStore((s) => s.dateRange);
  const activeStoreId = useAppStore((s) => s.activeStoreId);

  const storeId = options.storeId ?? activeStoreId ?? undefined;
  const from = format(dateRange.from, "yyyy-MM-dd");
  const to = format(dateRange.to, "yyyy-MM-dd");
  const limit = options.limit ?? 50;

  const { data: customers, error, isLoading } = useSWR(
    ["analytics/customers", storeId, from, to, limit],
    () => getCustomers({ store_id: storeId, from, to, limit }),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  return {
    customers,
    isLoading,
    isError: !!error,
  };
}
