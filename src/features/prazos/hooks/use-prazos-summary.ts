"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPrazosSummary } from "../services/prazos.service";

/**
 * Contadores agregados da agenda de prazos — GET /v1/prazos/summary. Objeto único
 * (sem cursor), alimenta a KpiRow. Query separada da lista para que os cards não
 * pisquem a cada página/filtro; o componente só consome este hook. Espelha
 * useProcessosSummary / useIntimacoesSummary.
 */
export function usePrazosSummary() {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["prazos", "summary"],
    queryFn: () => getPrazosSummary(fetcher),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    error: query.error,
  };
}
