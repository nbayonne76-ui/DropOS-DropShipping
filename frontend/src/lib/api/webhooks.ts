import { apiClient } from "./client";
import type { WebhookEvent } from "@/types/api";

export async function getWebhookEvents(
  storeId?: string,
  limit = 20
): Promise<WebhookEvent[]> {
  return apiClient.get<WebhookEvent[]>("/webhooks/events", {
    store_id: storeId,
    limit,
  });
}
