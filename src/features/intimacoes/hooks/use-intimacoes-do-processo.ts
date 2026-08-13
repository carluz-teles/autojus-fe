"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listIntimacoesByProcesso } from "../services/intimacoes.service";

/**
 * Intimações vinculadas ao processo — leitura via React Query, sem paginação (a
 * aba mostra o conjunto do processo, como usePrazosDoProcesso/useTasksDoProcesso).
 * Desligado enquanto `processoId` for vazio.
 */
export function useIntimacoesDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["intimacoes", "processo", processoId],
    queryFn: () =>
      listIntimacoesByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
  });

  return {
    intimacoes: query.data?.data ?? [],
    totalCount: query.data?.page.total_count ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
