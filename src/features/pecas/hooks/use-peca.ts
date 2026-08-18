"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPeca } from "../services/pecas.service";
import type { PecaDetalheView } from "../types";

/**
 * Detalhe individual de uma peça (GET /v1/pecas/:id). Desligado enquanto `id`
 * for null — mesmo padrão de useIntimacao. 404 → isError com ApiError
 * kind=ENTITY_NOT_FOUND (tratado na camada de apresentação).
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
  });

  return {
    peca: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
