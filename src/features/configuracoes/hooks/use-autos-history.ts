"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getAutosHistory } from "../services/court-connections.service";

/** Histórico de buscas de autos (sync_run do court). Alimenta a seção "Buscas de
 *  autos" na aba Fontes de dados › Histórico. */
export function useAutosHistory() {
  const fetcher = useApi();
  return useQuery({
    queryKey: ["court-connections", "autos-history"],
    queryFn: () => getAutosHistory(fetcher),
    staleTime: 30_000,
  });
}
