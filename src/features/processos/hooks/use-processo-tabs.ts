"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { listActionItemsByProcesso } from "@/features/action-items/services/action-items.service";
import { listIntimacoesByProcesso } from "@/features/intimacoes/services/intimacoes.service";
import { listPrazosByProcesso } from "@/features/prazos/services/prazos.service";
import { useApi } from "@/lib/api/use-api";

// ── Intimações do processo ────────────────────────────────────────────────────

/**
 * Intimações de um processo — GET /v1/processos/:id/intimacoes (cursor DESC, carregadas por página). Desligado
 * enquanto `processoId` for vazio.
 */
export function useIntimacoesByProcesso(processoId: string) {
  const fetcher = useApi();
  const query = useInfiniteQuery({
    queryKey: ["intimacoes", "por-processo", processoId],
    queryFn: ({ pageParam }) =>
      listIntimacoesByProcesso(fetcher, {
        processoId,
        limit: 10,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: !!processoId,
  });
  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data) ?? [],
  };
}

// ── Prazos do processo ────────────────────────────────────────────────────────

const PRAZOS_PAGE_SIZE = 10;

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
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}

// ── Providências do processo ──────────────────────────────────────────────────

/**
 * Providências de um processo — GET /v1/processos/:id/action-items (soonest-due-first, paginadas). Desligado enquanto `processoId` for vazio.
 */
export function useActionItemsByProcesso(processoId: string) {
  const fetcher = useApi();
  const query = useInfiniteQuery({
    queryKey: ["action-items", "por-processo", processoId],
    queryFn: ({ pageParam }) =>
      listActionItemsByProcesso(fetcher, {
        processoId,
        limit: 10,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: !!processoId,
  });
  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data) ?? [],
  };
}
