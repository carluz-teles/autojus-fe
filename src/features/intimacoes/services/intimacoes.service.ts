import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  IntimacaoAnalise,
  IntimacaoBucketsEnvelope,
  IntimacaoDetalheView,
  IntimacaoView,
  PageEnvelope,
  TriagemBucketCounts,
} from "../types";

const ENDPOINT = "/v1/intimacoes";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListIntimacoesParams {
  group_by?: "cnj";
  sort?: "recent" | "deadline";
  cnj?: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
  /** Busca server-side por cnj_number (ILIKE). Omitido quando vazio. */
  search?: string;
  /** Filtro server-side de tipo (INTIMACAO|CITACAO|COMUNICACAO). */
  type?: string;
  /** Filtro server-side de situação de triagem (PENDING|RESOLVED|IGNORED). */
  user_status?: string;
  /** Filtro server-side de tribunal (exact match). */
  court?: string;
  /**
   * Filtro server-side de urgência (atraso|hoje|proximos_dois_dias|semana|
   * este_mes|mais_adiante|sem_data_definida). Nota: o valor de wire da tab
   * "Esta semana" é "semana" (não "esta_semana" — esse é só o nome do campo no
   * envelope `buckets`). `sem_providencia` foi removido (redesign); o BE o trata
   * como "sem filtro" para deep-links legados.
   */
  urgencia?: string;
  due_from?: string;
  due_to?: string;
  /** Filtro server-side de Status = work_stage (RECEIVED|AWAITING_CONFIRMATION|
   *  CONFIRMED|DRAFTING|PARTNER_REVIEW|FILED). Estágio derivado no BE. Aceita
   *  múltiplos valores (array) — serializados como CSV (`work_stage=A,B,C`) na
   *  query string, ex.: a fila de Triagem (RECEIVED,AWAITING_CONFIRMATION,
   *  CONFIRMED). Um único valor continua indo como string simples. */
  work_stage?: string | string[];
  /**
   * Filtro server-side de ORIGEM do prazo (closed set: declarado|validado|
   * calculado|divergente|ia|manual|sem_prazo). Alimenta as abas de origem da
   * Triagem — filtra a lista mas NÃO afeta as contagens do envelope
   * `origem_facets` (o BE ignora este filtro ao contar as facets, pra cada aba
   * mostrar o total real). Omitido quando vazio (= "Todos").
   */
  origem?: string;
  /** Recorte operacional da triagem; vazio mantém a listagem completa. */
  triage_lane?: "attention" | "ready" | "science" | "historical";
  /**
   * Filtro server-side do chip "Não confirmadas" (toggle de triagem) — restringe a
   * prazos sugeridos ainda não confirmados (deadline.status = 'PENDING'). Combina com
   * qualquer tab temporal; é um parâmetro à parte de `urgencia`.
   */
  nao_confirmado?: boolean;
  /**
   * Filtro server-side de responsável — "me" (toggle "Minhas") ou um uuid.
   * Casa contra assignee_user_id (0057). NÃO afeta as contagens do envelope
   * `buckets` (limitação conhecida do BE).
   */
  assignee?: string;
  // ── Dimensões da pipeline de Triagem (docs/erd-triagem-pipeline.md §9 U0 follow-up) ──
  /** ?lifecycle — lane de ciclo de vida derivada (a_triar|em_andamento|concluido);
   *  "" = todas. Filtra a lista server-side pra retornar SÓ aquela lane. */
  lifecycle?: string;
  /** ?disposicao — a PARTIÇÃO DISJUNTA de a_triar (analisando|trabalho|excecao|ciencia|
   *  sem_prazo); "" = todos. Só faz sentido com lifecycle=a_triar. Substitui os antigos
   *  ?is_excecao/?segmento (exceção agora é um valor disjunto de trabalho). */
  disposicao?: string;
}

export async function listIntimacoes(
  fetcher: ApiFetcher,
  {
    group_by,
    sort,
    cnj,
    limit = 20,
    cursor,
    search,
    type,
    user_status,
    court,
    urgencia,
    due_from,
    due_to,
    work_stage,
    origem,
    triage_lane,
    nao_confirmado,
    assignee,
    lifecycle,
    disposicao,
  }: ListIntimacoesParams = {},
  signal?: AbortSignal,
): Promise<IntimacaoBucketsEnvelope> {
  return fetcher<IntimacaoBucketsEnvelope>(ENDPOINT, {
    signal,
    query: {
      group_by,
      sort,
      cnj,
      limit,
      cursor,
      search,
      type,
      user_status,
      court,
      urgencia,
      due_from,
      due_to,
      origem,
      triage_lane,
      lifecycle,
      disposicao,
      // Array vira CSV pro BE (que hoje aceita 1 valor mas está sendo
      // estendido em paralelo pra aceitar múltiplos separados por vírgula) —
      // `apiFetch.query` só serializa string|number|boolean, então o join
      // acontece aqui, não em buildUrl. Array vazio vira "" → omitido (undefined).
      work_stage: Array.isArray(work_stage)
        ? work_stage.join(",") || undefined
        : work_stage,
      nao_confirmado,
      assignee,
    },
  });
}

/**
 * Contagens da pipeline de Triagem — GET /v1/intimacoes/pipeline-counts. Aceita os
 * mesmos filtros compartilhados da lista (search/urgência/responsável/origem/…) MENOS
 * as dimensões que ele particiona (lifecycle/is_excecao/segmento) e a paginação. Uma
 * agregação por request; as abas/segmentos leem daqui (nunca da página carregada).
 */
export interface PipelineCountsParams {
  search?: string;
  type?: string;
  user_status?: string;
  court?: string;
  urgencia?: string;
  due_from?: string;
  due_to?: string;
  origem?: string;
  triage_lane?: "attention" | "ready" | "science" | "historical";
  nao_confirmado?: boolean;
  assignee?: string;
  cnj?: string;
}

export async function getPipelineCounts(
  fetcher: ApiFetcher,
  {
    search,
    type,
    user_status,
    court,
    urgencia,
    due_from,
    due_to,
    origem,
    triage_lane,
    nao_confirmado,
    assignee,
    cnj,
  }: PipelineCountsParams = {},
  signal?: AbortSignal,
): Promise<TriagemBucketCounts> {
  return fetcher<TriagemBucketCounts>(`${ENDPOINT}/pipeline-counts`, {
    signal,
    query: {
      search,
      type,
      user_status,
      court,
      urgencia,
      due_from,
      due_to,
      origem,
      triage_lane,
      nao_confirmado,
      assignee,
      cnj,
    },
  });
}

export interface ListIntimacoesByProcessoParams {
  processoId: string;
  limit?: number;
  cursor?: string;
}

/** Intimações de um processo — GET /v1/processos/:id/intimacoes (cursor DESC). */
export async function listIntimacoesByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 100, cursor }: ListIntimacoesByProcessoParams,
): Promise<PageEnvelope<IntimacaoView>> {
  return fetcher<PageEnvelope<IntimacaoView>>(
    `/v1/processos/${processoId}/intimacoes`,
    { query: { limit, cursor } },
  );
}

/**
 * Detalhe individual — GET /v1/intimacoes/:id → IntimacaoDetalheView (a forma da
 * lista + teor completo, órgão julgador e destinatários) ou 404 (ApiError
 * kind=ENTITY_NOT_FOUND). O deep-link busca por id quando a intimação não está nas
 * páginas carregadas.
 */
export async function getIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoDetalheView> {
  return fetcher<IntimacaoDetalheView>(`${ENDPOINT}/${id}`);
}

/** Marca como resolvida — POST /v1/intimacoes/:id/resolve → intimação atualizada. */
export async function resolveIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoView> {
  return fetcher<IntimacaoView>(`${ENDPOINT}/${id}/resolve`, {
    method: "POST",
  });
}

export async function resolveIntimacoesBatch(
  fetcher: ApiFetcher,
  ids: string[],
): Promise<number> {
  await Promise.all(ids.map((id) => resolveIntimacao(fetcher, id)));
  return ids.length;
}

/**
 * Confirma os prazos da faixa CONFIÁVEL (low-risk) em lote — POST /v1/prazos/confirm-batch.
 * Sem `intimationIds` (ou vazio) confirma TODOS os confiáveis (`all: true`). Com uma lista,
 * confirma só os prazos confiáveis dessas intimações (o BE filtra a faixa low-risk mesmo com
 * ids — exceções nunca entram). O contador `affected` reflete só os efetivamente confirmados.
 */
export async function confirmTrustedDeadlinesBatch(
  fetcher: ApiFetcher,
  intimationIds?: string[],
): Promise<{ affected: number }> {
  const all = !intimationIds || intimationIds.length === 0;
  return fetcher<{ affected: number }>("/v1/prazos/confirm-batch", {
    method: "POST",
    body: { all, intimation_ids: all ? [] : intimationIds },
  });
}

/** Ignora a intimação — POST /v1/intimacoes/:id/ignore → intimação atualizada. */
export async function ignoreIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoView> {
  return fetcher<IntimacaoView>(`${ENDPOINT}/${id}/ignore`, {
    method: "POST",
  });
}

/** Reabre uma intimação resolvida/ignorada — POST /v1/intimacoes/:id/reopen. */
export async function reopenIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoView> {
  return fetcher<IntimacaoView>(`${ENDPOINT}/${id}/reopen`, {
    method: "POST",
  });
}

/**
 * Gera (ou regera) a análise IA — POST /v1/intimacoes/:id/analise → a análise recém-criada.
 * Re-executável ("Gerar novamente" sobrescreve). O BE degrada internamente (IA off/erro →
 * summary vazio + providências vazias), então esta chamada só falha em 404/400/rede.
 */
export async function analisarIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoAnalise> {
  return fetcher<IntimacaoAnalise>(`${ENDPOINT}/${id}/analise`, {
    method: "POST",
  });
}

export interface AssignResponsavelParams {
  assigneeUserId: string | null;
}

/**
 * Atribui (ou desatribui, com null) o responsável de uma intimação —
 * PUT /v1/intimacoes/:id/responsavel. O BE reescreve numa tx e ecoa o
 * IntimacaoDetalheView fresco, então o aside reidrata a partir da linha persistida.
 */
export async function assignIntimacaoResponsavel(
  fetcher: ApiFetcher,
  id: string,
  { assigneeUserId }: AssignResponsavelParams,
): Promise<IntimacaoDetalheView> {
  return fetcher<IntimacaoDetalheView>(`${ENDPOINT}/${id}/responsavel`, {
    method: "PUT",
    body: { assignee_user_id: assigneeUserId },
  });
}
