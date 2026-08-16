import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  PageEnvelope,
  PartesView,
  ProcessoFilters,
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
