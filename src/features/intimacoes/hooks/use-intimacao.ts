"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getIntimacao } from "../services/intimacoes.service";

/**
 * Detalhe individual da intimação (GET /v1/intimacoes/:id) — usado no deep-link,
 * quando a intimação de origem de um prazo quase nunca está nas páginas já
 * carregadas da lista. Desligado enquanto `id` for null (dependent query do
 * React Query v5: enabled: !!id). Espelha usePrazo.
 */
export function useIntimacao(id: string | null) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["intimacoes", "detail", id],
    queryFn: () => getIntimacao(fetcher, id as string),
    enabled: !!id,
  });

  return {
    intimacao: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
