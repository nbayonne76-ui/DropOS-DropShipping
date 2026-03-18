"use client";

import useSWR, { mutate } from "swr";
import {
  getUnreadCount,
  listNotifications,
  markRead as apiMarkRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/api";

const NOTIFICATIONS_KEY = "/notifications";
const UNREAD_COUNT_KEY = "/notifications/unread-count";

// Poll every 30 seconds
const REFRESH_INTERVAL = 30_000;

export function useNotifications(limit = 30, unreadOnly = false) {
  const { data, error, isLoading, mutate: mutateList } = useSWR<Notification[]>(
    [NOTIFICATIONS_KEY, limit, unreadOnly],
    () => listNotifications({ limit, unread_only: unreadOnly }),
    { refreshInterval: REFRESH_INTERVAL },
  );

  return {
    notifications: data ?? [],
    isLoading,
    error,
    mutate: mutateList,
  };
}

export function useUnreadCount() {
  const { data, error, isLoading, mutate: mutateCount } = useSWR(
    UNREAD_COUNT_KEY,
    getUnreadCount,
    { refreshInterval: REFRESH_INTERVAL },
  );

  return {
    count: data?.count ?? 0,
    isLoading,
    error,
    mutate: mutateCount,
  };
}

export async function markNotificationRead(notificationId?: string) {
  await apiMarkRead(notificationId);
  // Revalidate both list and count
  await mutate(UNREAD_COUNT_KEY);
  await mutate((key: unknown) => Array.isArray(key) && key[0] === NOTIFICATIONS_KEY, undefined, {
    revalidate: true,
  });
}
