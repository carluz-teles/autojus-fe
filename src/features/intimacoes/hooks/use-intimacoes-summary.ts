"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getIntimacoesSummary } from "../services/intimacoes.service";

/**
 * Contadores agregados da inbox de intimações — GET /v1/intimacoes/summary.
 * Objeto único (sem cursor), alimenta a KpiRow. Query separada da lista para que
 * os cards não pisquem a cada página/busca; o componente só consome este hook.
 */
export function useIntimacoesSummary() {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["intimacoes", "summary"],
    queryFn: () => getIntimacoesSummary(fetcher),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    error: query.error,
  };
}
