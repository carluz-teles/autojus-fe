"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { notificationKeys } from "../notification-keys";
import { listNotifications } from "../services/notifications.service";

// Lista do painel do sino: a primeira página (mais recentes primeiro). O stream SSE
// (3b) invalida a query no push, então a lista se atualiza sozinha. Paginação
// "carregar mais" pode entrar depois (o BE já devolve next_cursor).
export function useNotifications() {
  const fetcher = useApi();
  return useQuery({
    queryKey: notificationKeys.list({}),
    queryFn: () => listNotifications(fetcher, { limit: 20 }),
  });
}
