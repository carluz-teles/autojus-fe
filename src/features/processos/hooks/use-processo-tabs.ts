"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { listIntimacoesByProcesso } from "@/features/intimacoes/services/intimacoes.service";
import { listPrazosByProcesso } from "@/features/prazos/services/prazos.service";
import { listTasksByProcesso } from "@/features/tasks/services/tasks.service";
import { useApi } from "@/lib/api/use-api";

// ── Intimações do processo ────────────────────────────────────────────────────

/**
 * Intimações de um processo — GET /v1/processos/:id/intimacoes (cursor DESC, tudo
 * em memória via limit=100, pois a aba não tem paginação própria). Desligado
 * enquanto `processoId` for vazio.
 */
export function useIntimacoesByProcesso(processoId: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: ["intimacoes", "por-processo", processoId],
    queryFn: () =>
      listIntimacoesByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
    select: (data) => data.data,
  });
}

// ── Prazos do processo ────────────────────────────────────────────────────────

const PRAZOS_PAGE_SIZE = 20;

/**
 * Prazos de um processo — GET /v1/processos/:id/prazos (soonest-first, acumulados
 * via useInfiniteQuery). Desligado enquanto `processoId` for vazio.
 */
export function usePrazosByProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useInfiniteQuery({
    queryKey: ["prazos", "por-processo", processoId],
    queryFn: ({ pageParam }) =>
      listPrazosByProcesso(fetcher, {
        processoId,
        limit: PRAZOS_PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    enabled: !!processoId,
  });

  const prazos = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    prazos,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

// ── Tarefas do processo ───────────────────────────────────────────────────────

/**
 * Tarefas de um processo — GET /v1/processos/:id/tasks (soonest-due-first, tudo
 * em memória via limit=100). Desligado enquanto `processoId` for vazio.
 */
export function useTasksByProcesso(processoId: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: ["tasks", "por-processo", processoId],
    queryFn: () => listTasksByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
    select: (data) => data.data,
  });
}
