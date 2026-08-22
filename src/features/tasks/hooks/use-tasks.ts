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
  getTask,
  getTasksSummary,
  listTasks,
  updateTask,
} from "../services/tasks.service";
import type { TaskStatus } from "../types";

const PAGE_SIZE = 30;

// Chaves de query centralizadas para invalidação consistente. Espelha
// intimacoesKeys/processosKeys.
export const tasksKeys = {
  all: ["tasks"] as const,
  lists: () => [...tasksKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...tasksKeys.lists(), params] as const,
  detail: (id: string) => [...tasksKeys.all, "detail", id] as const,
  summary: () => [...tasksKeys.all, "summary"] as const,
};

export interface TasksFilters {
  /** Status cru (OPEN/DONE/DISMISSED) — o filtro server-side. As abas de
   *  display_status (Aberta/Em execução/Atrasada) refinam OPEN no cliente. */
  status?: TaskStatus;
  /** Id interno do responsável (assignee) — filtro server-side. */
  assignee?: string;
}

/**
 * Agenda de tarefas do master-detail: leitura por cursor ACUMULADA
 * (useInfiniteQuery) — "Mostrar mais" pede a próxima página sem derrubar as
 * carregadas. Mesmo idioma de useIntimacoes/useProcessos.
 */
export function useTasks(filters: TasksFilters = {}) {
  const fetcher = useApi();
  const params = {
    status: filters.status,
    assignee: filters.assignee || undefined,
  };

  const query = useInfiniteQuery({
    queryKey: tasksKeys.list(params),
    queryFn: ({ pageParam }) =>
      listTasks(fetcher, {
        ...params,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0];

  return {
    tarefas: pages.flatMap((p) => p.data),
    totalCount: first?.page.total_count ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
  };
}

/** Contadores da agenda — GET /v1/tasks/summary (buckets do display_status). */
export function useTasksSummary() {
  const fetcher = useApi();
  return useQuery({
    queryKey: tasksKeys.summary(),
    queryFn: () => getTasksSummary(fetcher),
  });
}

/** Detalhe de uma tarefa — GET /v1/tasks/:id (usado pelo preview do master-detail). */
export function useTaskDetalhe(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: tasksKeys.detail(id),
    queryFn: () => getTask(fetcher, id),
    enabled: !!id,
  });
}

/**
 * Atribuição em massa. NÃO há endpoint de massa no BE — fan-out client-side de
 * PATCH /tasks/:id (assignee_user_id) sobre os ids MARCADOS. Débito: bulk no BE.
 */
export function useBulkAssignTasks() {
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
          updateTask(fetcher, id, { assignee_user_id: assigneeUserId }),
        ),
      );
      return { affected: ids.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tasksKeys.lists() });
    },
  });
}
