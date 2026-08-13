"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getTasksSummary } from "../services/tasks.service";

/**
 * Contadores agregados da agenda de tarefas — GET /v1/tasks/summary. Objeto único
 * (sem cursor), alimenta a KpiRow. Query separada da lista para que os cards não
 * pisquem a cada página/filtro; o componente só consome este hook. Espelha
 * usePrazosSummary.
 */
export function useTasksSummary() {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["tasks", "summary"],
    queryFn: () => getTasksSummary(fetcher),
  });

  return {
    summary: query.data,
    isPending: query.isPending,
    error: query.error,
  };
}
