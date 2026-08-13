"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getProcesso } from "../services/processos.service";

/**
 * Detalhe individual do processo (GET /v1/processos/:id) — base do cockpit
 * (página dedicada). Busca por id, então abre para QUALQUER processo, esteja ou
 * não nas páginas carregadas da lista. Espelha useIntimacao: desligado enquanto
 * `id` for vazio (dependent query do React Query v5).
 */
export function useProcessoDetalhe(id: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["processos", "detail", id],
    queryFn: () => getProcesso(fetcher, id),
    enabled: !!id,
  });

  return {
    processo: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
