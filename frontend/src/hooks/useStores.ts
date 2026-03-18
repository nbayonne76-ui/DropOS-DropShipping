import useSWR from "swr";
import { useCallback, useRef, useState } from "react";
import { getStores, triggerSync } from "@/lib/api/stores";
import { getJobStatus } from "@/lib/api/jobs";
import type { Store } from "@/types/api";

export type SyncJobState =
  | { status: "idle" }
  | { status: "queued" | "in_progress"; jobId: string }
  | { status: "complete"; jobId: string }
  | { status: "error"; jobId: string | null; message: string };

interface UseStoresResult {
  stores: Store[];
  isLoading: boolean;
  isError: boolean;
  syncState: Record<string, SyncJobState>;
  mutate: () => void;
  syncStore: (storeId: string) => Promise<void>;
}

const POLL_INTERVAL_MS = 2_000;
const POLL_MAX_ATTEMPTS = 90; // 3 minutes at 2s intervals

export function useStores(): UseStoresResult {
  const { data, error, isLoading, mutate } = useSWR<Store[]>(
    "/stores",
    () => getStores(),
    { revalidateOnFocus: false, dedupingInterval: 10_000 }
  );

  const [syncState, setSyncState] = useState<Record<string, SyncJobState>>({});
  const pollTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const stopPolling = useCallback((storeId: string) => {
    if (pollTimers.current[storeId]) {
      clearInterval(pollTimers.current[storeId]);
      delete pollTimers.current[storeId];
    }
  }, []);

  const syncStore = useCallback(
    async (storeId: string) => {
      setSyncState((prev) => ({ ...prev, [storeId]: { status: "queued", jobId: "" } }));
      stopPolling(storeId);

      let jobId: string | null = null;
      try {
        const response = await triggerSync(storeId);
        jobId = response.job_id;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to trigger sync";
        setSyncState((prev) => ({
          ...prev,
          [storeId]: { status: "error", jobId: null, message },
        }));
        return;
      }

      if (!jobId) {
        // No job ID returned — backend may be in sync-inline mode; just refresh
        await mutate();
        setSyncState((prev) => ({ ...prev, [storeId]: { status: "complete", jobId: "" } }));
        return;
      }

      setSyncState((prev) => ({
        ...prev,
        [storeId]: { status: "queued", jobId },
      }));

      let attempts = 0;
      pollTimers.current[storeId] = setInterval(async () => {
        attempts++;
        try {
          const job = await getJobStatus(jobId!);

          if (job.status === "complete") {
            stopPolling(storeId);
            setSyncState((prev) => ({
              ...prev,
              [storeId]: { status: "complete", jobId: jobId! },
            }));
            await mutate();
            return;
          }

          if (job.status === "not_found" || job.error) {
            stopPolling(storeId);
            setSyncState((prev) => ({
              ...prev,
              [storeId]: {
                status: "error",
                jobId: jobId!,
                message: job.error ?? "Job not found or expired",
              },
            }));
            return;
          }

          // queued | in_progress | deferred
          setSyncState((prev) => ({
            ...prev,
            [storeId]: { status: job.status as "queued" | "in_progress", jobId: jobId! },
          }));
        } catch {
          // Network blip — keep polling unless we've hit the limit
        }

        if (attempts >= POLL_MAX_ATTEMPTS) {
          stopPolling(storeId);
          setSyncState((prev) => ({
            ...prev,
            [storeId]: {
              status: "error",
              jobId: jobId!,
              message: "Sync is taking too long — check back later",
            },
          }));
        }
      }, POLL_INTERVAL_MS);
    },
    [mutate, stopPolling]
  );

  return {
    stores: data ?? [],
    isLoading,
    isError: !!error,
    syncState,
    mutate,
    syncStore,
  };
}
