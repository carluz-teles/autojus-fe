"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getActionItem } from "../services/action-items.service";

// Chaves de query centralizadas para invalidação consistente. Espelha
// intimacoesKeys/processosKeys.
export const actionItemsKeys = {
  all: ["action-items"] as const,
  lists: () => [...actionItemsKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...actionItemsKeys.lists(), params] as const,
  detail: (id: string) => [...actionItemsKeys.all, "detail", id] as const,
  summary: () => [...actionItemsKeys.all, "summary"] as const,
};

/** Detalhe de uma providência — GET /v1/action-items/:id. */
export function useActionItemDetalhe(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: actionItemsKeys.detail(id),
    queryFn: () => getActionItem(fetcher, id),
    refetchInterval: (query) =>
      query.state.data?.draft_id &&
      ["TODO", "WORKING"].includes(query.state.data.status)
        ? 5000
        : false,
    enabled: !!id,
  });
}
