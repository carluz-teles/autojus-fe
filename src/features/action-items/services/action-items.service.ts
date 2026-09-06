import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  ActionItemsSummary,
  ActionItemStatus,
  ActionItemTipo,
  ActionItemView,
  PageEnvelope,
  UpdateActionItemInput,
} from "../types";

const ENDPOINT = "/v1/action-items";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook. Espelha
// prazos.service.ts.

/** Envelope { data } que os endpoints de item único de action-item usam
 *  (list/summary usam envelopes próprios; :id e as transições devolvem { data }). */
interface DataEnvelope<T> {
  data: T;
}

export interface ListActionItemsParams {
  /** Filtra pelo status de trabalho (server-side). TODO|WORKING|DONE — SUGGESTED
   *  nunca é aceito/retornado no board. Omitido = todos os 3. */
  status?: ActionItemStatus;
  /** Id interno do responsável — base do filtro "meus" (aceita "me"). Omitido = de todos. */
  assignee?: string;
  /** Filtra pelo tipo do ato (contestar/recorrer/…). */
  tipo?: ActionItemTipo;
  /** Janela de vencimento ("YYYY-MM-DD", sem hora/timezone). Omitidas = sem recorte. */
  from?: string;
  to?: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

/** Board/fila — as providências do tenant, filtráveis por status/responsável/tipo/janela. */
export async function listActionItems(
  fetcher: ApiFetcher,
  {
    status,
    assignee,
    tipo,
    from,
    to,
    limit = 20,
    cursor,
  }: ListActionItemsParams = {},
): Promise<PageEnvelope<ActionItemView>> {
  return fetcher<PageEnvelope<ActionItemView>>(ENDPOINT, {
    query: { status, assignee, tipo, from, to, limit, cursor },
  });
}

/**
 * Contadores do board — GET /v1/action-items/summary → objeto único (sem envelope
 * de cursor), nos buckets a_fazer/em_elaboracao/concluida. Alimenta a KpiRow.
 */
export async function getActionItemsSummary(
  fetcher: ApiFetcher,
): Promise<ActionItemsSummary> {
  return fetcher<ActionItemsSummary>(`${ENDPOINT}/summary`);
}

export interface ListActionItemsByProcessoParams {
  processoId: string;
  limit?: number;
  cursor?: string;
}

/** Aba do processo — providências vinculadas ao court_record daquele processo. */
export async function listActionItemsByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListActionItemsByProcessoParams,
): Promise<PageEnvelope<ActionItemView>> {
  return fetcher<PageEnvelope<ActionItemView>>(
    `/v1/processos/${processoId}/action-items`,
    { query: { limit, cursor } },
  );
}

/**
 * Detalhe individual — GET /v1/action-items/:id → { data: ActionItemView } ou 404
 * (ApiError kind=ENTITY_NOT_FOUND). O deep-link busca por id quando a providência
 * não está nas páginas carregadas.
 */
export async function getActionItem(
  fetcher: ApiFetcher,
  id: string,
): Promise<ActionItemView> {
  const res = await fetcher<DataEnvelope<ActionItemView>>(`${ENDPOINT}/${id}`);
  return res.data;
}

/**
 * Edita os campos de uma providência — PATCH /v1/action-items/:id → { data: ActionItemView }.
 * Ajuste parcial: só os campos presentes mudam. `due_date: ""` limpa; `assignee_user_id: ""`
 * desatribui. Status muda por iniciar/comecar/concluir. 404 (ENTITY_NOT_FOUND) se não existe.
 */
export async function updateActionItem(
  fetcher: ApiFetcher,
  id: string,
  patch: UpdateActionItemInput,
): Promise<ActionItemView> {
  const res = await fetcher<DataEnvelope<ActionItemView>>(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    body: patch,
  });
  return res.data;
}

/** Inicia a providência (SUGGESTED→TODO) — POST /v1/action-items/:id/iniciar. */
export async function iniciarActionItem(
  fetcher: ApiFetcher,
  id: string,
): Promise<ActionItemView> {
  const res = await fetcher<DataEnvelope<ActionItemView>>(
    `${ENDPOINT}/${id}/iniciar`,
    { method: "POST" },
  );
  return res.data;
}

/** Começa o trabalho / dá ciência (TODO→WORKING) — POST /v1/action-items/:id/comecar. */
export async function comecarActionItem(
  fetcher: ApiFetcher,
  id: string,
): Promise<ActionItemView> {
  const res = await fetcher<DataEnvelope<ActionItemView>>(
    `${ENDPOINT}/${id}/comecar`,
    { method: "POST" },
  );
  return res.data;
}

/** Conclui a providência (WORKING→DONE) — POST /v1/action-items/:id/concluir. */
export async function concluirActionItem(
  fetcher: ApiFetcher,
  id: string,
): Promise<ActionItemView> {
  const res = await fetcher<DataEnvelope<ActionItemView>>(
    `${ENDPOINT}/${id}/concluir`,
    { method: "POST" },
  );
  return res.data;
}
