"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { createTask } from "@/features/tasks/services/tasks.service";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";

import {
  analisarIntimacao,
  aprovarProvidencia,
  assignIntimacaoResponsavel,
  type AssignResponsavelParams,
  type BulkAssignParams,
  bulkAssignResponsavel,
  descartarProvidencia,
  getIntimacao,
  getIntimacoesSummary,
  ignoreIntimacao,
  listIntimacoes,
  reopenIntimacao,
  resolveIntimacao,
} from "../services/intimacoes.service";
import type {
  IntimacaoDetalheView,
  IntimacaoProvidencia,
  IntimacoesBuckets,
} from "../types";

const EMPTY_BUCKETS: IntimacoesBuckets = {
  atraso: 0,
  hoje: 0,
  proximos_dois_dias: 0,
  esta_semana: 0,
  este_mes: 0,
  mais_adiante: 0,
  sem_data_definida: 0,
};

const PAGE_SIZE = 20;

// Chaves de query centralizadas para invalidação consistente.
export const intimacoesKeys = {
  all: ["intimacoes"] as const,
  lists: () => [...intimacoesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...intimacoesKeys.lists(), params] as const,
  detail: (id: string) => [...intimacoesKeys.all, "detail", id] as const,
  summary: () => [...intimacoesKeys.all, "summary"] as const,
};

export interface IntimacoesFilters {
  type?: string;
  user_status?: string;
  court?: string;
  /** atraso|hoje|proximos_dois_dias|semana|este_mes|mais_adiante|sem_data_definida */
  urgencia?: string;
  /** Chip "Não confirmadas" (triagem) — filtra prazos sugeridos não confirmados. */
  naoConfirmado?: boolean;
  /** "me" (toggle "Minhas") ou um uuid; casa contra condutor OU revisor. */
  assignee?: string;
}

/**
 * Hook público da feature — inbox de intimações do master-detail: leitura por cursor
 * ACUMULADA via useInfiniteQuery (mesmo idioma de useAndamentosDoProcesso) — cada tab de
 * urgência dispara um fetch real (?urgencia=...) e "Mostrar mais" só pede a próxima
 * página, sem perder as já carregadas. Busca server-side (debounce por cnj_number/
 * classe/órgão). `buckets` traz as contagens reais por urgência (independem de
 * `urgencia`, mas NÃO de `assignee` — limitação conhecida do BE).
 */
export function useIntimacoes(filters: IntimacoesFilters = {}) {
  const fetcher = useApi();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);

  const params = {
    search: debouncedSearch || undefined,
    type: filters.type || undefined,
    user_status: filters.user_status || undefined,
    court: filters.court || undefined,
    urgencia: filters.urgencia || undefined,
    nao_confirmado: filters.naoConfirmado || undefined,
    assignee: filters.assignee || undefined,
  };

  const query = useInfiniteQuery({
    queryKey: intimacoesKeys.list(params),
    queryFn: ({ pageParam }) =>
      listIntimacoes(fetcher, {
        ...params,
        limit: PAGE_SIZE,
        cursor: pageParam || undefined,
      }),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor,
    // Mantém os dados da faixa/filtro anterior enquanto a nova query carrega, pra
    // trocar tab/filtro NÃO derrubar a página inteira no skeleton (isPending só é
    // true no 1º load). O loading da troca fica scoped na lista via isFetching.
    placeholderData: keepPreviousData,
  });

  const pages = query.data?.pages ?? [];
  const first = pages[0];

  return {
    intimacoes: pages.flatMap((p) => p.data),
    filters: first?.filters ?? {},
    buckets: first?.buckets ?? EMPTY_BUCKETS,
    totalCount: first?.page.total_count ?? 0,
    total: first?.page.total ?? 0,
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

/** Detalhe de uma intimação — GET /v1/intimacoes/:id. */
export function useIntimacaoDetalhe(id: string) {
  const fetcher = useApi();
  return useQuery({
    queryKey: intimacoesKeys.detail(id),
    queryFn: () => getIntimacao(fetcher, id),
    enabled: !!id,
  });
}

/** Contadores do inbox — GET /v1/intimacoes/summary. */
export function useIntimacoesSummary() {
  const fetcher = useApi();
  return useQuery({
    queryKey: intimacoesKeys.summary(),
    queryFn: () => getIntimacoesSummary(fetcher),
  });
}

/** Invalida lista + summary + detalhe de uma intimação. */
function useInvalidarIntimacoes() {
  const qc = useQueryClient();
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: intimacoesKeys.all });
    if (id) qc.invalidateQueries({ queryKey: intimacoesKeys.detail(id) });
  };
}

/** Resolve a intimação (POST /v1/intimacoes/:id/resolve). */
export function useResolverIntimacao() {
  const fetcher = useApi();
  const invalidar = useInvalidarIntimacoes();
  return useMutation({
    mutationFn: (id: string) => resolveIntimacao(fetcher, id),
    onSuccess: (_, id) => invalidar(id),
  });
}

/** Ignora a intimação (POST /v1/intimacoes/:id/ignore). */
export function useIgnorarIntimacao() {
  const fetcher = useApi();
  const invalidar = useInvalidarIntimacoes();
  return useMutation({
    mutationFn: (id: string) => ignoreIntimacao(fetcher, id),
    onSuccess: (_, id) => invalidar(id),
  });
}

/** Reabre a intimação (POST /v1/intimacoes/:id/reopen). */
export function useReabrirIntimacao() {
  const fetcher = useApi();
  const invalidar = useInvalidarIntimacoes();
  return useMutation({
    mutationFn: (id: string) => reopenIntimacao(fetcher, id),
    onSuccess: (_, id) => invalidar(id),
  });
}

/**
 * Gera/regera a análise IA da intimação — POST /v1/intimacoes/:id/analise.
 * Ao concluir, faz patch do cache do detalhe com os campos ai_* retornados, de modo que o
 * card "Analisar esta intimação" transita para o estado pós-análise sem refetch; e invalida
 * o detalhe para reidratar da linha persistida. Re-executável ("Gerar novamente" sobrescreve).
 */
export function useAnalisarIntimacao(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analisarIntimacao(fetcher, intimacaoId),
    onSuccess: (analise) => {
      qc.setQueryData<IntimacaoDetalheView>(
        intimacoesKeys.detail(intimacaoId),
        (prev) =>
          prev
            ? {
                ...prev,
                ai_summary: analise.summary,
                ai_providencias: analise.providencias,
                ai_analyzed_at: analise.analyzed_at,
              }
            : prev,
      );
      qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) });
    },
  });
}

/**
 * Aprova uma providência sugerida: primeiro cria a tarefa REAL (POST /v1/tasks, slice deadline)
 * com título/descrição/responsável/vencimento da providência ligada à intimação; só então marca
 * a providência como APPROVED (POST .../aprovar, slice acquisition). A orquestração vive aqui — o
 * BE mantém os slices desacoplados (acquisition não importa a entity de task). No sucesso faz
 * patch do cache do detalhe (só ai_providencias) e invalida detalhe + tarefas.
 */
export function useAprovarProvidencia(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idx,
      providencia,
    }: {
      idx: number;
      providencia: IntimacaoProvidencia;
    }) => {
      // 1) cria a tarefa real (reusa o endpoint de tarefas do slice deadline)
      const task = await createTask(fetcher, {
        title: providencia.title,
        description: providencia.description || undefined,
        assignee_user_id: providencia.suggested_assignee_user_id ?? undefined,
        due_date: providencia.due_date ?? undefined,
        intimation_id: intimacaoId,
      });
      // 2) marca a providência aprovada, gravando o id da tarefa p/ a referência do card
      return aprovarProvidencia(fetcher, intimacaoId, idx, task.id);
    },
    onSuccess: async (analise) => {
      qc.setQueryData<IntimacaoDetalheView>(
        intimacoesKeys.detail(intimacaoId),
        (prev) =>
          prev ? { ...prev, ai_providencias: analise.providencias } : prev,
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) }),
        qc.invalidateQueries({ queryKey: ["tasks"] }),
      ]);
    },
  });
}

/**
 * Descarta uma providência sugerida — POST .../descartar. Marca DISCARDED e faz patch do cache
 * do detalhe (só ai_providencias). Não cria tarefa. Idempotente.
 */
export function useDescartarProvidencia(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (idx: number) =>
      descartarProvidencia(fetcher, intimacaoId, idx),
    onSuccess: (analise) => {
      qc.setQueryData<IntimacaoDetalheView>(
        intimacoesKeys.detail(intimacaoId),
        (prev) =>
          prev ? { ...prev, ai_providencias: analise.providencias } : prev,
      );
      qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) });
    },
  });
}

/**
 * Atribui/desatribui o responsável único (0057) — PUT /v1/intimacoes/:id/responsavel.
 * Atualiza o cache do detalhe com o IntimacaoDetalheView fresco do BE.
 */
export function useAssignIntimacaoResponsavel(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: AssignResponsavelParams) =>
      assignIntimacaoResponsavel(fetcher, intimacaoId, params),
    onSuccess: (detalhe) => {
      qc.setQueryData(intimacoesKeys.detail(intimacaoId), detalhe);
    },
  });
}

/**
 * Atribuição em massa do responsável — POST /v1/intimacoes/bulk/responsavel. Invalida
 * a lista (e o detalhe, caso a intimação aberta tenha sido afetada) pra reidratar.
 */
export function useBulkAssignResponsavel() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: BulkAssignParams) =>
      bulkAssignResponsavel(fetcher, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: intimacoesKeys.lists() });
      qc.invalidateQueries({ queryKey: intimacoesKeys.all });
    },
  });
}
