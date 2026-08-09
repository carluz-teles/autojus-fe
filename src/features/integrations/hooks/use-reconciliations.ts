"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getReconciliations } from "../services/reconciliations.service";

export const RECONCILIATIONS_KEY = ["acquisition", "reconciliations"] as const;

// Estado das reconciliações (aba da tela de integrações). Mesmo padrão de polling
// auto-desligável do useImportStatus: enquanto a importação roda, refaz a cada
// 10s; parada, o timer morre sozinho e o SSE/refresh cobre o resto.
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
