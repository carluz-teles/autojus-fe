"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { notificationKeys } from "../notification-keys";
import { getUnreadCount } from "../services/notifications.service";

// Badge do sino: contagem de não-lidas do usuário. O stream SSE (3b) invalida esta
// query no push, então o número sobe sozinho quando um aviso chega.
export function useUnreadCount() {
  const fetcher = useApi();
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => getUnreadCount(fetcher),
  });
}
