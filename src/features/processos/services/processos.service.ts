import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  PageEnvelope,
  PartesView,
  ProcessoFilters,
  ProcessoPhase,
  ProcessoResumoView,
  ProcessosSummary,
  ProcessoView,
} from "../types";

const ENDPOINT = "/v1/processos";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListProcessosParams extends ProcessoFilters {
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
  /** Busca server-side por cnj_number (ILIKE). Omitido quando vazio. */
  search?: string;
  /** Filtro por lifecycle (ACTIVE|SUSPENDED|ARCHIVED). Omitido quando vazio. */
  lifecycle?: string;
}

export async function listProcessos(
  fetcher: ApiFetcher,
  {
    limit = 20,
    cursor,
    search,
    lifecycle,
    ...filters
  }: ListProcessosParams = {},
): Promise<PageEnvelope<ProcessoView>> {
  return fetcher<PageEnvelope<ProcessoView>>(ENDPOINT, {
    query: {
      limit,
      cursor,
      search,
      lifecycle,
      ...filters,
    },
  });
}

/**
 * Detalhe individual — GET /v1/processos/:id → ProcessoView (mesma forma do item
 * da lista) ou 404 (ApiError kind=ENTITY_NOT_FOUND). Espelha getIntimacao: o
 * deep-link busca por id, sem depender das páginas já carregadas da lista.
 */
export async function getProcesso(
  fetcher: ApiFetcher,
  id: string,
): Promise<ProcessoView> {
  return fetcher<ProcessoView>(`${ENDPOINT}/${id}`);
}

/**
 * Contadores da lista — GET /v1/processos/summary → objeto único (sem envelope
 * de cursor). Alimenta a KpiRow do topo da tela.
 */
export async function getProcessosSummary(
  fetcher: ApiFetcher,
): Promise<ProcessosSummary> {
  return fetcher<ProcessosSummary>(`${ENDPOINT}/summary`);
}

/**
 * Resumo do processo por IA — GET /v1/processos/:id/resume. Write-once
 * sync-on-first-GET no BE: a primeira abertura gera (chama o LLM) e persiste;
 * as seguintes servem do cache. O :id é o court_record id (o mesmo de
 * /processos). Slices sempre inicializados; em degrade summary="" + risks [].
 */
export async function getProcessoResumo(
  fetcher: ApiFetcher,
  id: string,
): Promise<ProcessoResumoView> {
  return fetcher<ProcessoResumoView>(`${ENDPOINT}/${id}/resume`);
}

/**
 * Partes do processo — GET /v1/processos/:id/partes → {autor,reu,terceiros}. O
 * :id é o court_record id (o mesmo que /processos devolve). Cada lista já vem
 * inicializada pelo BE (nunca null); alimenta os cards AUTOR/RÉU do cockpit.
 */
export async function getPartes(
  fetcher: ApiFetcher,
  id: string,
): Promise<PartesView> {
  return fetcher<PartesView>(`${ENDPOINT}/${id}/partes`);
}

/**
 * Atribui (ou desatribui, com userId null) o responsável — PUT
 * /v1/processos/:id/responsavel {user_id}. O BE reescreve numa tx e ecoa o
 * ProcessoView fresco, então o header reidrata a partir da linha persistida.
 */
export async function assignResponsavel(
  fetcher: ApiFetcher,
  id: string,
  userId: string | null,
): Promise<ProcessoView> {
  return fetcher<ProcessoView>(`${ENDPOINT}/${id}/responsavel`, {
    method: "PUT",
    body: { user_id: userId },
  });
}

/**
 * PATCH /v1/processos/:id — grava os campos preenchidos à mão no cockpit: a fase
 * (phase, override manual), o valor da causa (claim_value) e/ou o apelido manual
 * do título (label). Parcial: só os campos enviados são escritos. `label: ""`
 * limpa o override e volta o título ao fallback automático (contrato do BE).
 * O BE re-lê e ecoa o ProcessoView fresco.
 */
export async function updateProcessoManual(
  fetcher: ApiFetcher,
  id: string,
  body: { phase?: ProcessoPhase; claim_value?: number; label?: string },
): Promise<ProcessoView> {
  return fetcher<ProcessoView>(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    body,
  });
}

/** Atribuição em massa do responsável. `all=true` aplica a toda a
 *  faixa/filtro atual (inclui não paginados) via os filtros; senão aplica
 *  aos `ids` (court_record ids). Espelha bulkAssignResponsavel de Intimações —
 *  mesmo contrato, só o nome do campo de usuário muda (`user_id` no BE deste
 *  slice, em vez de `assignee_user_id`). */
export interface BulkAssignResponsavelParams {
  userId: string | null;
  all: boolean;
  ids: string[];
  /** filtros ativos — usados só no modo all; espelham o GET /processos. */
  search?: string;
  court?: string;
  lifecycle?: string;
  degree?: string;
  assignee?: string;
}

export async function bulkAssignResponsavel(
  fetcher: ApiFetcher,
  params: BulkAssignResponsavelParams,
): Promise<{ affected: number }> {
  return fetcher<{ affected: number }>(`${ENDPOINT}/bulk/responsavel`, {
    method: "POST",
    body: {
      user_id: params.userId,
      all: params.all,
      ids: params.ids,
      search: params.search ?? "",
      court: params.court ?? "",
      lifecycle: params.lifecycle ?? "",
      degree: params.degree ?? "",
      assignee: params.assignee ?? "",
    },
  });
}
