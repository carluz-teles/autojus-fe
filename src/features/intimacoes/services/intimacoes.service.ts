import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  IntimacaoAnalise,
  IntimacaoBucketsEnvelope,
  IntimacaoDetalheView,
  IntimacaoProvidencia,
  IntimacaoView,
  IntimacoesSummary,
  PageEnvelope,
} from "../types";

const ENDPOINT = "/v1/intimacoes";
const ACTION_ITEMS_ENDPOINT = "/v1/action-items";

/** Envelope { data } que os endpoints de action-item usam (diferente do GET
 *  /v1/intimacoes/:id, que devolve o objeto direto). */
interface DataEnvelope<T> {
  data: T;
}

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListIntimacoesParams {
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
  /** Filtro server-side de Status = work_stage (RECEIVED|AWAITING_CONFIRMATION|
   *  CONFIRMED|DRAFTING|PARTNER_REVIEW|FILED). Estágio derivado no BE. */
  work_stage?: string;
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
}

export async function listIntimacoes(
  fetcher: ApiFetcher,
  {
    limit = 20,
    cursor,
    search,
    type,
    user_status,
    court,
    urgencia,
    work_stage,
    nao_confirmado,
    assignee,
  }: ListIntimacoesParams = {},
): Promise<IntimacaoBucketsEnvelope> {
  return fetcher<IntimacaoBucketsEnvelope>(ENDPOINT, {
    query: {
      limit,
      cursor,
      search,
      type,
      user_status,
      court,
      urgencia,
      work_stage,
      nao_confirmado,
      assignee,
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

/**
 * Contadores da inbox — GET /v1/intimacoes/summary → objeto único (sem envelope
 * de cursor). Alimenta a KpiRow do topo da tela.
 */
export async function getIntimacoesSummary(
  fetcher: ApiFetcher,
): Promise<IntimacoesSummary> {
  return fetcher<IntimacoesSummary>(`${ENDPOINT}/summary`);
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

/**
 * Confirma a providência sugerida pela IA — POST /v1/action-items/:id/confirmar.
 * Promove tipo_status "a_confirmar"→"confiavel"; a tarefa REAL nasce sozinha, depois,
 * via worker assíncrono (a UI faz poll curto no detalhe até o task_id aparecer — ver
 * useConfirmarActionItem). Idempotente, body vazio.
 */
export async function confirmarActionItem(
  fetcher: ApiFetcher,
  actionItemId: string,
): Promise<IntimacaoProvidencia> {
  const res = await fetcher<DataEnvelope<IntimacaoProvidencia>>(
    `${ACTION_ITEMS_ENDPOINT}/${actionItemId}/confirmar`,
    { method: "POST" },
  );
  return res.data;
}

/**
 * Descarta a providência — POST /v1/action-items/:id/descartar. status→DISCARDED.
 * Idempotente, body vazio.
 */
export async function descartarActionItem(
  fetcher: ApiFetcher,
  actionItemId: string,
): Promise<IntimacaoProvidencia> {
  const res = await fetcher<DataEnvelope<IntimacaoProvidencia>>(
    `${ACTION_ITEMS_ENDPOINT}/${actionItemId}/descartar`,
    { method: "POST" },
  );
  return res.data;
}

export interface ReclassificarActionItemParams {
  pieceProfileKey: string;
  tipo: string;
}

/**
 * Reclassifica o tipo de peça da providência — POST /v1/action-items/:id/reclassificar.
 * Muda tipo_origem→"manual". 400 quando piece_profile_key/tipo não são de um catálogo
 * válido (ver GET /v1/piece-profiles); 409 quando já existe peça protocolada.
 */
export async function reclassificarActionItem(
  fetcher: ApiFetcher,
  actionItemId: string,
  { pieceProfileKey, tipo }: ReclassificarActionItemParams,
): Promise<IntimacaoProvidencia> {
  const res = await fetcher<DataEnvelope<IntimacaoProvidencia>>(
    `${ACTION_ITEMS_ENDPOINT}/${actionItemId}/reclassificar`,
    { method: "POST", body: { piece_profile_key: pieceProfileKey, tipo } },
  );
  return res.data;
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

/** Atribuição em massa do responsável. `all=true` aplica a toda a faixa/filtro
 *  atual (inclui não paginados) via os filtros; senão aplica aos `ids`. */
export interface BulkAssignParams {
  assigneeUserId: string | null;
  all: boolean;
  ids: string[];
  /** filtros ativos — usados só no modo all. */
  urgencia?: string;
  nao_confirmado?: boolean;
  search?: string;
  type?: string;
  user_status?: string;
  court?: string;
  assignee?: string;
}

export async function bulkAssignResponsavel(
  fetcher: ApiFetcher,
  params: BulkAssignParams,
): Promise<{ affected: number }> {
  return fetcher<{ affected: number }>(`${ENDPOINT}/bulk/responsavel`, {
    method: "POST",
    body: {
      assignee_user_id: params.assigneeUserId,
      all: params.all,
      ids: params.ids,
      urgencia: params.urgencia ?? "",
      nao_confirmado: params.nao_confirmado ?? false,
      search: params.search ?? "",
      type: params.type ?? "",
      user_status: params.user_status ?? "",
      court: params.court ?? "",
      assignee: params.assignee ?? "",
    },
  });
}
