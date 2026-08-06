"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { notificationKeys } from "../notification-keys";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.service";

// Mutations de leitura (marcar um / marcar todos). Ambas invalidam a lista e o badge
// no sucesso (o BE é idempotente, então re-marcar é inofensivo).
export function useMarkNotifications() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationRead(fetcher, id),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => markAllNotificationsRead(fetcher),
    onSuccess: invalidate,
  });

  return { markOne, markAll };
}
