import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  DataEnvelope,
  NotificationChannel,
  NotificationPreference,
  NotificationView,
  PageEnvelope,
} from "../types";

// Camada de rede da feature (recebe o fetcher ligado ao Clerk). Não conhece React/cache.
const BASE = "/v1/notifications";

export interface ListNotificationsParams {
  limit?: number;
  /** Cursor opaco: eco do next_cursor para a próxima página. */
  cursor?: string;
  /** true → só os não-lidos deste usuário. */
  unread?: boolean;
}

export function listNotifications(
  fetcher: ApiFetcher,
  { limit = 20, cursor, unread }: ListNotificationsParams = {},
): Promise<PageEnvelope<NotificationView>> {
  return fetcher<PageEnvelope<NotificationView>>(BASE, {
    query: { limit, cursor, unread },
  });
}

export function getUnreadCount(
  fetcher: ApiFetcher,
): Promise<{ count: number }> {
  return fetcher<{ count: number }>(`${BASE}/unread-count`);
}

export function markNotificationRead(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  return fetcher<void>(`${BASE}/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead(fetcher: ApiFetcher): Promise<void> {
  return fetcher<void>(`${BASE}/read-all`, { method: "POST" });
}

export function getNotificationPreferences(
  fetcher: ApiFetcher,
): Promise<DataEnvelope<NotificationPreference>> {
  return fetcher<DataEnvelope<NotificationPreference>>(`${BASE}/preferences`);
}

export function setNotificationPreference(
  fetcher: ApiFetcher,
  type: string,
  channels: NotificationChannel[],
): Promise<NotificationPreference> {
  return fetcher<NotificationPreference>(`${BASE}/preferences`, {
    method: "PUT",
    body: { type, channels },
  });
}
