"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getActionItem,
  getActionItemsSummary,
  listActionItems,
  updateActionItem,
} from "../services/action-items.service";
import type { ActionItemStatus } from "../types";

const PAGE_SIZE = 30;

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

export interface ActionItemsFilters {
  /** Status de trabalho (TODO/WORKING/DONE) — filtro server-side. Omitido = os 3. */
  status?: ActionItemStatus;
  /** Id interno do responsável (assignee) — filtro server-side. Aceita "me"
   *  (o BE resolve pro usuário do JWT — usado pelo escopo "Meus"). */
  assignee?: string;
  /** Tamanho de página (server-side). Default 30. A Fila/Board pedem uma janela
   *  maior num único fetch — não têm affordance de paginação nessas telas. */
  pageSize?: number;
}

/**
 * Board/fila de providências: leitura por cursor ACUMULADA (useInfiniteQuery) —
 * "Mostrar mais" pede a próxima página sem derrubar as carregadas. Mesmo idioma
 * de useIntimacoes/useProcessos.
 */
export function useActionItems(filters: ActionItemsFilters = {}) {
  const fetcher = useApi();
  const pageSize = filters.pageSize ?? PAGE_SIZE;
  const params = {
    status: filters.status,
    assignee: filters.assignee || undefined,
    pageSize,
  };

  const query = useInfiniteQuery({
    queryKey: actionItemsKeys.list(params),
    queryFn: ({ pageParam }) =>
      listActionItems(fetcher, {
        status: params.status,
        assignee: params.assignee,
        limit: pageSize,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0];

  return {
    providencias: pages.flatMap((p) => p.data),
    totalCount: first?.page.total_count ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  };
}

/** Contadores do board — GET /v1/action-items/summary (a_fazer/em_elaboracao/concluida). */
export function useActionItemsSummary() {
  const fetcher = useApi();
  return useQuery({
    queryKey: actionItemsKeys.summary(),
    queryFn: () => getActionItemsSummary(fetcher),
  });
}

/** Detalhe de uma providência — GET /v1/action-items/:id. */
export function useActionItemDetalhe(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: actionItemsKeys.detail(id),
    queryFn: () => getActionItem(fetcher, id),
    enabled: !!id,
  });
}

/**
 * Atribuição em massa. NÃO há endpoint de massa no BE — fan-out client-side de
 * PATCH /action-items/:id (assignee_user_id) sobre os ids MARCADOS. Débito: bulk no BE.
 */
export function useBulkAssignActionItems() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      assigneeUserId,
    }: {
      ids: string[];
      assigneeUserId: string;
    }) => {
      await Promise.all(
        ids.map((id) =>
          updateActionItem(fetcher, id, { assignee_user_id: assigneeUserId }),
        ),
      );
      return { affected: ids.length };
    },
    onSuccess: (_data, { ids }) => {
      qc.invalidateQueries({ queryKey: actionItemsKeys.lists() });
      // lists() não cobre detail() (chaves hierárquicas distintas); invalida cada
      // detalhe afetado pra o painel de preview não ficar stale.
      for (const id of ids) {
        qc.invalidateQueries({ queryKey: actionItemsKeys.detail(id) });
      }
    },
  });
}
