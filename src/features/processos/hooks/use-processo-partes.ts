"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPartes } from "../services/processos.service";

/**
 * Partes do processo (GET /v1/processos/:id/partes) para os cards AUTOR/RÉU do
 * cockpit. Dependent query (desligada enquanto `id` for vazio); o BE já entrega
 * cada polo como array inicializado, então o componente mapeia sem checar null.
 */
export function useProcessoPartes(id: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["processos", "partes", id],
    queryFn: () => getPartes(fetcher, id),
    enabled: !!id,
  });

  return {
    autor: query.data?.autor ?? [],
    reu: query.data?.reu ?? [],
    terceiros: query.data?.terceiros ?? [],
    isPending: query.isPending,
    isError: query.isError,
  };
}
