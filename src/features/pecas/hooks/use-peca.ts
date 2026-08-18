"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPeca } from "../services/pecas.service";
import type { PecaDetalheView, PecaSagaState } from "../types";

/** Estados de saga que encerram o polling (terminais). */
const TERMINAL_SAGA_STATES: PecaSagaState[] = [
  "CREATED",
  "REVIEWED",
  "SIGNED",
  "FILED",
  "LABELED",
  "FAILED",
];

const POLLING_INTERVAL_MS = 2_000;

/**
 * Detalhe individual de uma peça (GET /v1/pecas/:id). Desligado enquanto `id`
 * for null — mesmo padrão de useIntimacao. 404 → isError com ApiError
 * kind=ENTITY_NOT_FOUND (tratado na camada de apresentação).
 *
 * Polling: enquanto saga_state==="EXTRACTING" refaz a cada 2s (auto-stop em
 * estados terminais — mesmo padrão de useImportStatus).
 */
export function usePeca(id: string | null): {
  peca: PecaDetalheView | null;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
} {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["pecas", "detail", id],
    queryFn: async () => {
      const res = await getPeca(fetcher, id as string);
      return res.data;
    },
    enabled: !!id,
    // Polling que para sozinho em estados terminais — mesma mecânica de useImportStatus.
    refetchInterval: (query) => {
      const state = query.state.data?.saga_state;
      if (!state) return false;
      return TERMINAL_SAGA_STATES.includes(state as PecaSagaState)
        ? false
        : POLLING_INTERVAL_MS;
    },
    refetchIntervalInBackground: false,
  });

  return {
    peca: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
