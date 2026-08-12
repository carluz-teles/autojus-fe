"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPrazo } from "../services/prazos.service";

/**
 * Detalhe individual do prazo (o "por quê" completo). Desligado enquanto `id` for
 * null — segue o padrão de dependent query do React Query v5 (enabled: !!id).
 */
export function usePrazo(id: string | null) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["prazos", "detail", id],
    queryFn: () => getPrazo(fetcher, id as string),
    enabled: !!id,
  });

  return {
    prazo: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
