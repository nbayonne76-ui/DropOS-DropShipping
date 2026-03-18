import type { ApiKey, ApiKeyCreated, CreateApiKeyRequest } from "@/types/api";
import { apiClient } from "./client";

export async function listApiKeys(): Promise<ApiKey[]> {
  return apiClient.get<ApiKey[]>("/api-keys");
}

export async function createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyCreated> {
  return apiClient.post<ApiKeyCreated>("/api-keys", data);
}

export async function revokeApiKey(keyId: string): Promise<void> {
  return apiClient.delete<void>(`/api-keys/${keyId}`);
}
