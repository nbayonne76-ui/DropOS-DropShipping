import type { AuditLogEntry } from "@/types/api";
import { apiClient } from "./client";

export async function listAuditLog(params?: {
  action?: string;
  resource_type?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogEntry[]> {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.resource_type) qs.set("resource_type", params.resource_type);
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.offset !== undefined) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiClient.get<AuditLogEntry[]>(`/audit-log${suffix}`);
}
