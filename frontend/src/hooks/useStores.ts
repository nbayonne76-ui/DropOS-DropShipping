import useSWR from "swr";
import { getStores, triggerSync } from "@/lib/api/stores";
import type { Store } from "@/types/api";
import { useState } from "react";

interface UseStoresResult {
  stores: Store[];
  isLoading: boolean;
  isError: boolean;
  syncingId: string | null;
  mutate: () => void;
  syncStore: (storeId: string) => Promise<void>;
}

export function useStores(): UseStoresResult {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<Store[]>(
    "/stores",
    () => getStores(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10_000,
    }
  );

  async function syncStore(storeId: string): Promise<void> {
    setSyncingId(storeId);
    try {
      await triggerSync(storeId);
      await mutate();
    } finally {
      setSyncingId(null);
    }
  }

  return {
    stores: data ?? [],
    isLoading,
    isError: !!error,
    syncingId,
    mutate,
    syncStore,
  };
}
