"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { notificationKeys } from "../notification-keys";
import {
  getNotificationPreferences,
  setNotificationPreference,
} from "../services/notifications.service";
import type { NotificationChannel } from "../types";

// Lista as preferências salvas pelo usuário (tipos sem override não aparecem — o
// caller reconcilia contra NOTIFICATION_TYPES, que é a lista estática de tipos
// conhecidos do produto).
export function useNotificationPreferences() {
  const fetcher = useApi();
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => getNotificationPreferences(fetcher),
  });
}

// Mutation que salva o conjunto completo de canais para UM tipo (a PUT substitui o
// conjunto inteiro, não é um delta). Invalida a lista de preferências no sucesso.
export function useSetNotificationPreference() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      channels,
    }: {
      type: string;
      channels: NotificationChannel[];
    }) => setNotificationPreference(fetcher, type, channels),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}
