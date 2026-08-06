"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getImportStatus } from "../services/import-status.service";

export const IMPORT_STATUS_KEY = ["acquisition", "import-status"] as const;

// Estado da importação para o banner. Lê no load (sobrevive a refresh) e faz polling
// que se AUTO-DESLIGA: enquanto importing=true refaz a cada 10s (o backfill fecha em
// ~1-2 min); quando termina, o predicado retorna false e o timer para sozinho. O toast
// de import_finished (stream SSE) dá o "pronto" instantâneo; o banner some no próximo
// poll.
export function useImportStatus() {
  const fetcher = useApi();
  return useQuery({
    queryKey: IMPORT_STATUS_KEY,
    queryFn: () => getImportStatus(fetcher),
    refetchInterval: (query) => (query.state.data?.importing ? 10_000 : false),
    refetchIntervalInBackground: false,
  });
}
