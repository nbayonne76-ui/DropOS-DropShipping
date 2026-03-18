import { apiClient } from "./client";
import type { Store, SyncStatusResponse } from "@/types/api";

function normalizeStore(raw: Record<string, unknown>): Store {
  return {
    ...(raw as unknown as Store),
    domain: (raw.shopify_domain ?? raw.domain ?? "") as string,
    platform: (raw.platform ?? "shopify") as Store["platform"],
    sync_status: (raw.sync_status ?? (raw.last_synced_at ? "idle" : "never_synced")) as Store["sync_status"],
    orders_count: (raw.orders_count ?? 0) as number,
    webhook_configured: (raw.webhook_configured ?? false) as boolean,
  };
}

export async function getStores(): Promise<Store[]> {
  const raw = await apiClient.get<Record<string, unknown>[]>("/stores");
  return raw.map(normalizeStore);
}

export async function getStore(storeId: string): Promise<Store> {
  const raw = await apiClient.get<Record<string, unknown>>(`/stores/${storeId}`);
  return normalizeStore(raw);
}

export async function connectShopifyStore(domain: string): Promise<{ oauth_url: string }> {
  return apiClient.get<{ oauth_url: string }>(`/stores/oauth/start?shop=${encodeURIComponent(domain)}`);
}

export async function triggerSync(storeId: string, full = false): Promise<SyncStatusResponse> {
  return apiClient.post<SyncStatusResponse>(`/stores/${storeId}/sync?full=${full}`);
}

export async function disconnectStore(storeId: string): Promise<void> {
  return apiClient.delete<void>(`/stores/${storeId}`);
}

export async function updateStore(
  storeId: string,
  data: Partial<Pick<Store, "name" | "currency">> & { webhook_secret?: string }
): Promise<Store> {
  return apiClient.patch<Store>(`/stores/${storeId}`, data);
}
