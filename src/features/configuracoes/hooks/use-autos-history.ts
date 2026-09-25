"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getAutosHistory } from "../services/court-connections.service";

/** Histórico de buscas de autos (sync_run do court). Alimenta a seção "Buscas de
 *  autos" na aba Fontes de dados › Histórico.
 *  Faz polling a cada 5 s enquanto houver alguma sessão RUNNING para que o
 *  usuário veja o progresso em tempo real (sem recarregar a página). */
export function useAutosHistory() {
  const fetcher = useApi();
  return useQuery({
    queryKey: ["court-connections", "autos-history"],
    queryFn: () => getAutosHistory(fetcher),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasRunning = Array.isArray(data) && data.some((r) => r.status === "RUNNING");
      return hasRunning ? 5_000 : false;
    },
  });
}
