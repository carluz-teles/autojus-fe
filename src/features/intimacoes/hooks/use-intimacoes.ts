"use client";

import {
  keepPreviousData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { iniciarActionItem } from "@/features/action-items/services/action-items.service";
import { useApi } from "@/lib/api/use-api";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useInfinitePageBuffer } from "@/lib/hooks/use-infinite-page-buffer";

import {
  analisarIntimacao,
  assignIntimacaoResponsavel,
  type AssignResponsavelParams,
  type BulkAssignParams,
  bulkAssignResponsavel,
  confirmarActionItem,
  getIntimacao,
  getIntimacoesSummary,
  ignoreIntimacao,
  listIntimacoes,
  reclassificarActionItem,
  type ReclassificarActionItemParams,
  reopenIntimacao,
  resolveIntimacao,
} from "../services/intimacoes.service";
import type {
  IntimacaoDetalheView,
  IntimacoesBuckets,
  OrigemFacets,
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

const EMPTY_ORIGEM_FACETS: OrigemFacets = {
  declarado: 0,
  validado: 0,
  calculado: 0,
  divergente: 0,
  ia: 0,
  manual: 0,
  a_classificar: 0,
  sem_prazo: 0,
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
  groupBy?: "cnj";
  sort?: "recent" | "deadline";
  cnj?: string;
  search?: string;
  type?: string;
  user_status?: string;
  court?: string;
  /** atraso|hoje|proximos_dois_dias|semana|este_mes|mais_adiante|sem_data_definida */
  urgencia?: string;
  dueFrom?: string;
  dueTo?: string;
  /** Status = work_stage (RECEIVED|AWAITING_CONFIRMATION|CONFIRMED|DRAFTING|
   *  PARTNER_REVIEW|FILED). Estágio derivado no BE. Aceita um valor único ou
   *  uma lista (ex.: a fila de Triagem filtra por 3 estágios de uma vez) — o
   *  service serializa a lista como CSV na query string. */
  workStage?: string | string[];
  /** Origem do prazo (declarado|validado|calculado|divergente|ia|manual|
   *  sem_prazo) — aba de origem da Triagem. Vazio/undefined = "Todos" (sem
   *  filtro). Não afeta as contagens de `origemFacets`. */
  origem?: string;
  /** Chip "Não confirmadas" (triagem) — filtra prazos sugeridos não confirmados. */
  naoConfirmado?: boolean;
  /** "me" (toggle "Minhas") ou um uuid; casa contra condutor OU revisor. */
  assignee?: string;
  /** Default true. false pula o fetch — ex: NovaPecaModal no contexto de um
   *  processo específico usa useIntimacoesByProcesso em vez desta lista geral. */
  enabled?: boolean;
  /** Antecipa uma página nas listagens; consultas de contagem não fazem prefetch. */
  prefetchNextPage?: boolean;
  /** Tamanho de página customizado — default PAGE_SIZE (20). */
  limit?: number;
}

/** Lista por cursor, com filtros no servidor e buffer opcional de uma página. */
export function useIntimacoes(filters: IntimacoesFilters = {}) {
  const fetcher = useApi();
  const [localSearch, setSearch] = useState("");
  const search = filters.search ?? localSearch;
  const debouncedSearch = useDebounce(search, 400);

  const params = {
    group_by: filters.groupBy,
    sort: filters.sort,
    cnj: filters.cnj,
    search: debouncedSearch || undefined,
    type: filters.type || undefined,
    user_status: filters.user_status || undefined,
    court: filters.court || undefined,
    urgencia: filters.urgencia || undefined,
    due_from: filters.dueFrom || undefined,
    due_to: filters.dueTo || undefined,
    work_stage: filters.workStage || undefined,
    origem: filters.origem || undefined,
    nao_confirmado: filters.naoConfirmado || undefined,
    assignee: filters.assignee || undefined,
    limit: filters.limit ?? PAGE_SIZE,
  };

  const queryKey = intimacoesKeys.list(params);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) =>
      listIntimacoes(
        fetcher,
        {
          ...params,
          cursor: pageParam || undefined,
        },
        signal,
      ),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.page.next_cursor || undefined,
    enabled: filters.enabled ?? true,
    // Mantém os dados da faixa/filtro anterior enquanto a nova query carrega, pra
    // trocar tab/filtro NÃO derrubar a página inteira no skeleton (isPending só é
    // true no 1º load). O loading da troca fica scoped na lista via isFetching.
    placeholderData: keepPreviousData,
  });

  const pagination = useInfinitePageBuffer(
    queryKey,
    query,
    !!filters.prefetchNextPage && (filters.enabled ?? true),
  );
  const pages = pagination.pages;
  const first = pages[0];

  return {
    intimacoes: pages.flatMap((p) => p.data),
    groups: pages.flatMap((p) => p.groups ?? []),
    processCount: first?.process_count ?? 0,
    totalWithoutUrgency: first?.total_without_urgency ?? 0,
    filters: first?.filters ?? {},
    buckets: first?.buckets ?? EMPTY_BUCKETS,
    origemFacets: first?.origem_facets ?? EMPTY_ORIGEM_FACETS,
    totalCount: first?.page.total_count ?? 0,
    total: first?.page.total ?? 0,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isSearchPending: search !== debouncedSearch,
    error: query.error,
    refetch: query.refetch,
    isPlaceholderData: query.isPlaceholderData,
    isFetchNextPageError: query.isFetchNextPageError,
    // busca
    search,
    setSearch,
    paginationKey: pagination.paginationKey,
    hasMore: pagination.hasMore,
    isLoadingMore: query.isFetchingNextPage,
    loadMore: pagination.loadMore,
  };
}

// ── Poll curto (auto-off) do detalhe após ações que disparam materialização
// assíncrona no BE (analisar/confirmar/descartar) ────────────────────────────
//
// Desde a migração de ai_providencias (jsonb) para action_item (tabela real), o
// BE materializa fora da request: (a) POST /analise devolve candidatos EFÊMEROS
// — as linhas de action_item só aparecem no GET seguinte, alguns instantes
// depois, via evento; (b) uma providência "confiavel" (declarada, ou IA recém-
// confirmada) ganha task_id só quando o worker cria a tarefa automática, também
// alguns instantes depois. A UI não pode saber ISSO sem perguntar de novo — daí
// o poll curto: guardamos um "poll-window" por intimação (fora do React, no
// cache do QueryClient) que as 3 mutations abrem, e o `refetchInterval` do
// detalhe consulta a cada render pra decidir se re-busca.
//
// Auto-off por DOIS critérios independentes (o que vier primeiro):
//   1. estabilizou: o `ai_analyzed_at` em cache já bate com o `targetAnalyzedAt`
//      esperado (só setado pela análise — confirmar/descartar não mudam esse
//      campo), as providências esperadas JÁ MATERIALIZARAM (ver
//      `expectedProvidenciasCount` — o POST /analise devolve os candidatos
//      efêmeros e a contagem deles; enquanto `ai_providencias` não refletir essa
//      contagem, seguimos polando, mesmo que `ai_analyzed_at` já bata), E nenhum
//      item "confiavel" ainda está com task_id null;
//   2. teto de tentativas (POLL_MAX_ATTEMPTS) — nunca gira pra sempre, mesmo se
//      o worker falhar silenciosamente.
const POLL_INTERVAL_MS = 1300;
const POLL_MAX_ATTEMPTS = 6; // ~7-8s de janela

interface PollWindow {
  /** dataUpdateCount do detalhe no instante em que a janela abriu — a diferença
   *  pro dataUpdateCount atual é "quantos refetches essa janela já fez". */
  baselineUpdateCount: number;
  /** Só setado pela análise: o ai_analyzed_at que ainda esperamos ver refletido
   *  no cache (linhas de providência materializadas). */
  targetAnalyzedAt?: string;
  /** Só setado pela análise: quantas providências os candidatos efêmeros do POST
   *  /analise prometeram. Enquanto `ai_providencias` (não-DISCARDED) não atingir
   *  essa contagem, a materialização ainda não terminou → seguimos polando e o
   *  card mantém o loading. 0 = análise legítima sem providência (não trava). */
  expectedProvidenciasCount?: number;
}

function pollWindowKey(id: string) {
  return [...intimacoesKeys.detail(id), "poll-window"] as const;
}

/** Abre (ou reabre) a janela de poll do detalhe desta intimação. */
function abrirJanelaDePoll(
  qc: QueryClient,
  id: string,
  targetAnalyzedAt?: string,
  expectedProvidenciasCount?: number,
) {
  const estadoAtual = qc.getQueryState(intimacoesKeys.detail(id));
  qc.setQueryData<PollWindow>(pollWindowKey(id), {
    baselineUpdateCount: estadoAtual?.dataUpdateCount ?? 0,
    targetAnalyzedAt,
    expectedProvidenciasCount,
  });
}

/** Providências já materializadas no detalhe. */
function providenciasVisiveis(i: IntimacaoDetalheView): number {
  return i.ai_providencias.length;
}

/** true = ainda falta a análise materializar (ver critério 1 acima). */
function algoPendente(
  i: IntimacaoDetalheView | undefined,
  janela: PollWindow,
): boolean {
  if (!i) return true;
  const { targetAnalyzedAt, expectedProvidenciasCount } = janela;
  // Análise recém-disparada: só estabiliza quando o ai_analyzed_at alvo refletiu
  // E as providências prometidas pelos candidatos efêmeros do POST já apareceram
  // no detalhe (a materialização é assíncrona no BE — pode chegar DEPOIS do
  // ai_analyzed_at). Contagem esperada 0 = análise sem providência → não trava.
  if (targetAnalyzedAt) {
    if (i.ai_analyzed_at !== targetAnalyzedAt) return true;
    if (
      expectedProvidenciasCount != null &&
      expectedProvidenciasCount > 0 &&
      providenciasVisiveis(i) < expectedProvidenciasCount
    ) {
      return true;
    }
  }
  return false;
}

/** Quantas tentativas de refetch a janela já consumiu. */
function tentativasDaJanela(
  qc: QueryClient,
  id: string,
  janela: PollWindow,
): number {
  const estado = qc.getQueryState(intimacoesKeys.detail(id));
  return (estado?.dataUpdateCount ?? 0) - janela.baselineUpdateCount;
}

/** Detalhe de uma intimação — GET /v1/intimacoes/:id. Faz poll curto e auto-off
 *  logo após analisar/confirmar/descartar (ver bloco acima).
 *
 *  `materializandoAnalise` = true quando há uma janela de poll ABERTA por uma
 *  ANÁLISE recém-disparada (tem `targetAnalyzedAt`) cuja materialização ainda não
 *  refletiu no detalhe — o card usa isso pra MANTER o loading depois que o POST
 *  volta (mutation.isPending já caiu), fechando o gap "loading some → vazio →
 *  providências". Respeita o mesmo auto-off do poll (teto + análise sem
 *  providência), pra nunca ficar em loading eterno. */
export function useIntimacaoDetalhe(id: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: intimacoesKeys.detail(id),
    queryFn: () => getIntimacao(fetcher, id),
    enabled: !!id,
    refetchInterval: (q) => {
      const janela = qc.getQueryData<PollWindow>(pollWindowKey(id));
      if (!janela) return false;
      if (tentativasDaJanela(qc, id, janela) >= POLL_MAX_ATTEMPTS) return false;
      if (!algoPendente(q.state.data, janela)) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const janela = qc.getQueryData<PollWindow>(pollWindowKey(id));
  const materializandoAnalise =
    !!janela &&
    !!janela.targetAnalyzedAt &&
    tentativasDaJanela(qc, id, janela) < POLL_MAX_ATTEMPTS &&
    algoPendente(query.data, janela);

  return { ...query, materializandoAnalise };
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
 * Gera/regera a análise IA da intimação — POST /v1/intimacoes/:id/analise. A resposta
 * traz candidatos EFÊMEROS (shape diferente da view persistida — sem id/status/task_id),
 * então NÃO fazemos mais patch direto do cache com ela. Em vez disso: invalidamos o
 * detalhe e abrimos a janela de poll curto (ver bloco acima) até as linhas de action_item
 * (e, pras declaradas, a tarefa automática) aparecerem. Re-executável ("Gerar novamente").
 */
export function useAnalisarIntimacao(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analisarIntimacao(fetcher, intimacaoId),
    onSuccess: (analise) => {
      // title/description agora são PERSISTIDOS no action_item (migração 0090) e vêm
      // no read model — não há mais cache de candidatos em sessionStorage. O poll
      // cobre a materialização das providências pela IA (assíncrona no acquisition).
      // Guardamos a contagem de candidatos efêmeros do POST como "quantas
      // providências ainda precisam materializar" — o poll (e o loading) só
      // fecham quando `ai_providencias` atingir essa contagem (ou o teto).
      abrirJanelaDePoll(
        qc,
        intimacaoId,
        analise.analyzed_at,
        analise.providencias.length,
      );
      qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) });
    },
  });
}

/**
 * Confirma o TIPO da providência — POST /v1/action-items/:id/confirmar. É o gate de
 * TIPO ("Confirmar tipo" do card de leitura), promove "a_confirmar"→"confiavel".
 * NÃO é o "Iniciar providência" (esse é `useIniciarProvidencia`). Invalida detalhe +
 * providências. Idempotente.
 */
export function useConfirmarActionItem(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) =>
      confirmarActionItem(fetcher, actionItemId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) }),
        qc.invalidateQueries({ queryKey: ["action-items"] }),
      ]);
    },
  });
}

/**
 * Inicia a providência sugerida — POST /v1/action-items/:id/iniciar (SUGGESTED→TODO).
 * É o "Iniciar providência": tira a sugestão do diagnóstico e a coloca no trabalho
 * (board/fila). Invalida o detalhe da intimação (a linha reflete "iniciada") + as
 * providências do board/fila.
 */
export function useIniciarProvidencia(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionItemId: string) =>
      iniciarActionItem(fetcher, actionItemId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: intimacoesKeys.detail(intimacaoId) }),
        qc.invalidateQueries({ queryKey: ["action-items"] }),
      ]);
    },
  });
}

/**
 * Reclassifica o tipo de peça da providência — POST /v1/action-items/:id/reclassificar.
 * Muda tipo_origem→"manual". Invalida o detalhe para reidratar piece_profile_key/tipo.
 */
export function useReclassificarActionItem(intimacaoId: string) {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      actionItemId,
      ...params
    }: { actionItemId: string } & ReclassificarActionItemParams) =>
      reclassificarActionItem(fetcher, actionItemId, params),
    onSuccess: () => {
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
