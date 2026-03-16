import { apiClient } from "./client";
import type { Store } from "@/types/api";

export async function getStores(): Promise<Store[]> {
  return apiClient.get<Store[]>("/stores");
}

export async function getStore(storeId: string): Promise<Store> {
  return apiClient.get<Store>(`/stores/${storeId}`);
}

export async function connectShopifyStore(domain: string): Promise<{ oauth_url: string }> {
  return apiClient.post<{ oauth_url: string }>("/stores/shopify/connect", {
    domain,
  });
}

export async function triggerSync(storeId: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>(`/stores/${storeId}/sync`);
}

export async function disconnectStore(storeId: string): Promise<void> {
  return apiClient.delete<void>(`/stores/${storeId}`);
}

export async function updateStore(
  storeId: string,
  data: Partial<Pick<Store, "name" | "currency">>
): Promise<Store> {
  return apiClient.patch<Store>(`/stores/${storeId}`, data);
}
