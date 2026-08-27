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
  createTaskComment,
  getTask,
  getTasksSummary,
  listTaskActivity,
  listTaskComments,
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
  comments: (id: string) => [...tasksKeys.all, "comments", id] as const,
  activity: (id: string) => [...tasksKeys.all, "activity", id] as const,
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

/** Thread de comentários da tarefa — GET /v1/tasks/:id/comments (mais antigo primeiro). */
export function useTaskComments(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: tasksKeys.comments(id),
    queryFn: () => listTaskComments(fetcher, id),
    enabled: !!id,
  });
}

/** Log de atividade da tarefa — GET /v1/tasks/:id/activity (mais recente primeiro). */
export function useTaskActivity(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: tasksKeys.activity(id),
    queryFn: () => listTaskActivity(fetcher, id),
    enabled: !!id,
  });
}

/**
 * Escreve um comentário — POST /v1/tasks/:id/comments. No sucesso invalida o thread e o
 * log de atividade da tarefa (o BE registra COMMENTED na mesma tx). `await` mantém o
 * isPending ligado até o refetch concluir.
 */
export function useCreateTaskComment(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => createTaskComment(fetcher, id, body),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: tasksKeys.comments(id) }),
        qc.invalidateQueries({ queryKey: tasksKeys.activity(id) }),
      ]);
    },
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
    onSuccess: (_data, { ids }) => {
      qc.invalidateQueries({ queryKey: tasksKeys.lists() });
      // Sem isso, o painel de preview (useTaskDetalhe) do item atualmente
      // selecionado fica com cache stale ("Responsável: —") logo após o bulk-
      // assign, mesmo com os cards da lista já mostrando o avatar certo — só
      // corrigia com reload manual. lists() não cobre detail() (chaves
      // hierárquicas distintas em tasksKeys); invalida cada detalhe afetado.
      for (const id of ids) {
        qc.invalidateQueries({ queryKey: tasksKeys.detail(id) });
      }
    },
  });
}
