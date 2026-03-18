import type {
  AlertRule,
  CreateAlertRuleRequest,
  Notification,
  UnreadCountResponse,
  UpdateAlertRuleRequest,
} from "@/types/api";
import { apiClient } from "./client";

// ── Alert rules ───────────────────────────────────────────────────────────────

export async function listAlertRules(): Promise<AlertRule[]> {
  return apiClient.get<AlertRule[]>("/notifications/rules");
}

export async function createAlertRule(data: CreateAlertRuleRequest): Promise<AlertRule> {
  return apiClient.post<AlertRule>("/notifications/rules", data);
}

export async function updateAlertRule(
  ruleId: string,
  data: UpdateAlertRuleRequest,
): Promise<AlertRule> {
  return apiClient.patch<AlertRule>(`/notifications/rules/${ruleId}`, data);
}

export async function deleteAlertRule(ruleId: string): Promise<void> {
  return apiClient.delete<void>(`/notifications/rules/${ruleId}`);
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function listNotifications(params?: {
  limit?: number;
  unread_only?: boolean;
}): Promise<Notification[]> {
  const qs = new URLSearchParams();
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  if (params?.unread_only) qs.set("unread_only", "true");
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiClient.get<Notification[]>(`/notifications${suffix}`);
}

export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiClient.get<UnreadCountResponse>("/notifications/unread-count");
}

export async function markRead(notificationId?: string): Promise<void> {
  const qs = notificationId ? `?notification_id=${notificationId}` : "";
  return apiClient.post<void>(`/notifications/mark-read${qs}`);
}
