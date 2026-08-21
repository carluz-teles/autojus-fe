import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  IntimacaoAnalise,
  IntimacaoBucketsEnvelope,
  IntimacaoDetalheView,
  IntimacaoView,
  IntimacoesSummary,
  PageEnvelope,
} from "../types";

const ENDPOINT = "/v1/intimacoes";

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
  /** Filtro server-side de urgência (atraso|hoje|semana|nao_confirmado). */
  urgencia?: string;
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
  }: ListIntimacoesParams = {},
): Promise<IntimacaoBucketsEnvelope> {
  return fetcher<IntimacaoBucketsEnvelope>(ENDPOINT, {
    query: { limit, cursor, search, type, user_status, court, urgencia },
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
 * Aprova a providência sugerida no índice `idx` — POST /v1/intimacoes/:id/providencias/:idx/aprovar.
 * Marca a providência como APPROVED e devolve a análise com as providências atualizadas. A criação
 * da tarefa REAL (POST /v1/tasks) é orquestrada ANTES no hook — o BE aqui só vira o status
 * (acquisition não importa a entity de deadline). Idempotente.
 */
export async function aprovarProvidencia(
  fetcher: ApiFetcher,
  id: string,
  idx: number,
  taskId?: string,
): Promise<IntimacaoAnalise> {
  return fetcher<IntimacaoAnalise>(
    `${ENDPOINT}/${id}/providencias/${idx}/aprovar`,
    { method: "POST", body: taskId ? { task_id: taskId } : undefined },
  );
}

/**
 * Descarta a providência sugerida no índice `idx` — POST /v1/intimacoes/:id/providencias/:idx/descartar.
 * Marca a providência como DISCARDED e devolve a análise atualizada. Idempotente.
 */
export async function descartarProvidencia(
  fetcher: ApiFetcher,
  id: string,
  idx: number,
): Promise<IntimacaoAnalise> {
  return fetcher<IntimacaoAnalise>(
    `${ENDPOINT}/${id}/providencias/${idx}/descartar`,
    { method: "POST" },
  );
}

export interface AssignResponsaveisParams {
  conductorUserId: string | null;
  reviewerUserId: string | null;
}

/**
 * Atribui (ou desatribui, com null) o condutor e/ou revisor de uma intimação —
 * PUT /v1/intimacoes/:id/responsaveis. O BE reescreve numa tx e ecoa o
 * IntimacaoDetalheView fresco, então o aside reidrata a partir da linha persistida.
 */
export async function assignIntimacaoResponsaveis(
  fetcher: ApiFetcher,
  id: string,
  { conductorUserId, reviewerUserId }: AssignResponsaveisParams,
): Promise<IntimacaoDetalheView> {
  return fetcher<IntimacaoDetalheView>(`${ENDPOINT}/${id}/responsaveis`, {
    method: "PUT",
    body: {
      conductor_user_id: conductorUserId,
      reviewer_user_id: reviewerUserId,
    },
  });
}
