"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

const PAGE_SIZE = 30;

import {
  assignResponsavel,
  bulkAssignResponsavel,
  getPartes,
  getProcesso,
  getProcessoResumo,
  getProcessosSummary,
  listProcessos,
  updateProcessoManual,
} from "../services/processos.service";
import type { ProcessoFilters, ProcessoPhase } from "../types";

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
  const debouncedSearch = useDebounce(search, 400);

  const params = {
    search: debouncedSearch || undefined,
    lifecycle: filters.lifecycle || undefined,
    court: filters.court || undefined,
    degree: filters.degree || undefined,
    assignee: filters.assignee || undefined,
  };

  // Leitura por cursor ACUMULADA (useInfiniteQuery) — "Mostrar mais" pede a próxima
  // página sem derrubar as carregadas; troca de aba/filtro mantém a anterior no ar
  // via keepPreviousData. Mesmo idioma de useIntimacoes (master-detail).
  const query = useInfiniteQuery({
    queryKey: processosKeys.list(params),
    queryFn: ({ pageParam }) =>
      listProcessos(fetcher, {
        ...params,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0];

  return {
    processos: pages.flatMap((p) => p.data),
    filters: first?.filters ?? {},
    totalCount: first?.page.total_count ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    // busca
    search,
    setSearch,
    // paginação incremental ("Mostrar mais")
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: query.fetchNextPage,
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

// Grava a fase (override) e/ou o valor da causa preenchidos à mão no cockpit (PATCH
// parcial). Mesmo padrão do responsável: o BE ecoa o ProcessoView fresco → reidrata o
// header a partir da linha persistida, e a lista é invalidada.
export function useUpdateProcessoManual(processoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { phase?: ProcessoPhase; claim_value?: number }) =>
      updateProcessoManual(fetcher, processoId, body),
    onSuccess: (processo) => {
      qc.setQueryData(processosKeys.detail(processoId), processo);
      qc.invalidateQueries({ queryKey: processosKeys.lists() });
    },
  });
}

/**
 * Atribuição em massa da lista — POST /v1/processos/bulk/responsavel (mesmo padrão
 * de useBulkAssignResponsavel de Intimações). Uma única requisição, mesmo com N
 * ids marcados. A UI de Processos hoje só marca ids específicos (sem toggle "toda
 * a faixa"), então este hook só expõe o modo `ids`; `all` fica pronto no serviço
 * para quando a UI ganhar esse modo.
 */
export function useBulkAssignResponsaveis() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ids,
      conductorUserId,
    }: {
      ids: string[];
      conductorUserId: string | null;
    }) =>
      bulkAssignResponsavel(fetcher, {
        userId: conductorUserId,
        all: false,
        ids,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: processosKeys.lists() });
    },
  });
}
