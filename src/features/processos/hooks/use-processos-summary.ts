"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getProcessosSummary } from "../services/processos.service";

/**
 * Contadores agregados da lista de processos — GET /v1/processos/summary. Objeto
 * único (sem cursor), alimenta a KpiRow. Query separada da lista para que os
 * cards não pisquem a cada página/busca; o componente só consome este hook.
 */
export function useProcessosSummary() {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["processos", "summary"],
    queryFn: () => getProcessosSummary(fetcher),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    error: query.error,
  };
}
