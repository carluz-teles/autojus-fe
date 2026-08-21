"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getCaptures } from "../services/captures.service";

export const CAPTURES_KEY = ["acquisition", "captures"] as const;

/**
 * Busca a lista de capturas. Enquanto alguma run estiver Em andamento, refaz
 * a cada 10s — espelha o padrão de use-reconciliations.ts.
 */
export function useCaptures() {
  const fetcher = useApi();
  return useQuery({
    queryKey: CAPTURES_KEY,
    queryFn: () => getCaptures(fetcher),
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? [];
      return runs.some((r) => r.display_status === "Em andamento")
        ? 10_000
        : false;
    },
    refetchIntervalInBackground: false,
  });
}
