import useSWR from "swr";
import { getWebhookEvents } from "@/lib/api/webhooks";
import type { WebhookEvent } from "@/types/api";

interface UseWebhookEventsResult {
  events: WebhookEvent[];
  isLoading: boolean;
  isError: boolean;
  mutate: () => void;
}

export function useWebhookEvents(
  storeId?: string,
  limit = 20
): UseWebhookEventsResult {
  const { data, error, isLoading, mutate } = useSWR<WebhookEvent[]>(
    storeId ? ["webhooks/events", storeId, limit] : null,
    () => getWebhookEvents(storeId, limit),
    { revalidateOnFocus: false, dedupingInterval: 15_000 }
  );

  return {
    events: data ?? [],
    isLoading,
    isError: !!error,
    mutate,
  };
}
