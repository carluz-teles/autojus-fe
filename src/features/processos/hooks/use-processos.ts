"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/ui/list-pagination";
import { useApi } from "@/lib/api/use-api";
import { useCursorPagination } from "@/lib/hooks/use-cursor-pagination";
import { useDebounce } from "@/lib/hooks/use-debounce";

import {
  assignResponsavel,
  getPartes,
  getProcesso,
  getProcessoResumo,
  getProcessosSummary,
  listProcessos,
} from "../services/processos.service";
import type { ProcessoFilters } from "../types";

// Chaves de query centralizadas para invalidação consistente.
export const processosKeys = {
  all: ["processos"] as const,
  lists: () => [...processosKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...processosKeys.lists(), params] as const,
  detail: (id: string) => [...processosKeys.all, "detail", id] as const,
  summary: () => [...processosKeys.all, "summary"] as const,
  partes: (id: string) => [...processosKeys.all, "partes", id] as const,
  resumo: (id: string) => [...processosKeys.all, "resumo", id] as const,
};

export interface ProcessosFiltersAtivos extends ProcessoFilters {
  lifecycle?: string;
}

/**
 * Hook público da feature — lista de processos: leitura por cursor (prev/próxima),
 * busca server-side (debounce por cnj_number), summary real e filtros sincronizados.
 * Espelha useIntimacoes.
 */
export function useProcessos(filters: ProcessosFiltersAtivos = {}) {
  const fetcher = useApi();
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const debouncedSearch = useDebounce(search, 400);

  // Resetar paginação quando filtros/busca mudam.
  const filterKey = JSON.stringify({
    ...filters,
    search: debouncedSearch,
    pageSize,
  });
  const pagination = useCursorPagination(filterKey);

  const params = {
    search: debouncedSearch || undefined,
    limit: pageSize,
    cursor: pagination.activeCursor,
    lifecycle: filters.lifecycle || undefined,
    court: filters.court || undefined,
    degree: filters.degree || undefined,
    assignee: filters.assignee || undefined,
  };

  const query = useQuery({
    queryKey: processosKeys.list(params),
    queryFn: () => listProcessos(fetcher, params),
    placeholderData: keepPreviousData,
  });

  const nextCursor = query.data?.page.next_cursor ?? null;

  return {
    processos: query.data?.data ?? [],
    filters: query.data?.filters ?? {},
    totalCount: query.data?.page.total_count ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // busca
    search,
    setSearch,
    // paginação
    pageSize,
    setPageSize,
    pageNumber: pagination.pageNumber,
    canPrev: pagination.canPrev,
    canNext: nextCursor !== null,
    onPrev: pagination.prev,
    onNext: () => {
      if (nextCursor) pagination.next(nextCursor);
    },
  };
}

/** Contadores da lista — GET /v1/processos/summary. */
export function useProcessosSummary() {
  const fetcher = useApi();
  return useQuery({
    queryKey: processosKeys.summary(),
    queryFn: () => getProcessosSummary(fetcher),
  });
}

/** Detalhe de um processo — GET /v1/processos/:id. */
export function useProcesso(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: processosKeys.detail(id),
    queryFn: () => getProcesso(fetcher, id),
    enabled: !!id,
  });
}

/** Partes do processo — GET /v1/processos/:id/partes. */
export function usePartes(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: processosKeys.partes(id),
    queryFn: () => getPartes(fetcher, id),
    enabled: !!id,
  });
}

/** Resumo IA do processo — GET /v1/processos/:id/resume. */
export function useProcessoResumo(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: processosKeys.resumo(id),
    queryFn: () => getProcessoResumo(fetcher, id),
    enabled: !!id,
  });
}

/** Atribui/desatribui responsável — PUT /v1/processos/:id/responsavel. */
export function useAssignResponsavel(processoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string | null) =>
      assignResponsavel(fetcher, processoId, userId),
    onSuccess: (processo) => {
      // Atualiza o detalhe na cache com o ProcessoView fresco devolvido pelo BE.
      qc.setQueryData(processosKeys.detail(processoId), processo);
      // Invalida a lista para refletir o novo responsável.
      qc.invalidateQueries({ queryKey: processosKeys.lists() });
    },
  });
}
