import type { ApiFetcher } from "@/lib/api/use-api";

import type { ActionItemView, UpdateActionItemInput } from "../types";

const ENDPOINT = "/v1/action-items";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook. Espelha
// prazos.service.ts.

/** Envelope { data } que os endpoints de item único de action-item usam
 *  (list/summary usam envelopes próprios; :id e as transições devolvem { data }). */
interface DataEnvelope<T> {
  data: T;
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
