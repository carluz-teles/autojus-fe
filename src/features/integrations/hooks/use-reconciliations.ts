"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getReconciliationDetail,
  getReconciliations,
  getSyncRunItems,
} from "../services/reconciliations.service";

export const RECONCILIATIONS_KEY = ["acquisition", "reconciliations"] as const;

// Lista de reconciliações (aba de integrações). Enquanto a importação roda, refaz
// a cada 10s; parada, o timer morre sozinho e o SSE/refresh cobre o resto.
export function useReconciliations() {
  const fetcher = useApi();
  return useQuery({
    queryKey: RECONCILIATIONS_KEY,
    queryFn: () => getReconciliations(fetcher),
    refetchInterval: (query) =>
      query.state.data?.import.importing ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
}

// Detalhe de uma importação (guarda-chuva + janelas). Refaz enquanto ainda RUNNING.
export function useReconciliationDetail(jobId: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: [...RECONCILIATIONS_KEY, "detail", jobId] as const,
    queryFn: () => getReconciliationDetail(fetcher, jobId),
    refetchInterval: (query) =>
      query.state.data?.reconciliation?.status === "RUNNING" ? 10_000 : false,
    refetchIntervalInBackground: false,
  });
}

// Itens de uma janela (collapse). enabled controla o lazy-load: só busca quando a
// linha é expandida.
export function useSyncRunItems(syncRunId: string, enabled: boolean) {
  const fetcher = useApi();
  return useQuery({
    queryKey: [...RECONCILIATIONS_KEY, "items", syncRunId] as const,
    queryFn: () => getSyncRunItems(fetcher, syncRunId),
    enabled,
    staleTime: 5 * 60_000,
  });
}
