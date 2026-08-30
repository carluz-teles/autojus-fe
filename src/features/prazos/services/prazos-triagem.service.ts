// Camada de rede da experiência Prazos (Inbox + Pipeline). MOCK-first: hoje lê do
// banco em memória; as assinaturas foram pensadas pra trocar o corpo por apiFetch
// sem mexer nos hooks. NÃO conhece React nem cache (responsabilidade dos hooks).
// Espelha o padrão dos outros services da app.
// TODO: ligar ao BE (GET /v1/prazos/inbox, /v1/prazos/board, etc.).

import {
  gerarTodos,
  type PrazoMock,
  type PrazoStage,
} from "../mocks/prazos.mock";

const espera = <T>(valor: T, ms = 80): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(valor), ms));

const clone = <T>(v: T): T => structuredClone(v);

/** Tudo que chegou — a Inbox e o Board derivam daqui (client-side, mock). */
export async function listPrazos(): Promise<PrazoMock[]> {
  return espera(clone(gerarTodos()));
}

/**
 * Aplica um override de estágio (o Board arrasta cards entre colunas). No mock,
 * apenas devolve o par id→stage; o hook mantém o mapa de overrides em memória.
 * No BE isto vira POST /v1/prazos/:id/move { stage }.
 */
export async function moverEstagio(
  id: string,
  stage: PrazoStage,
): Promise<{ id: string; stage: PrazoStage }> {
  return espera({ id, stage });
}

/**
 * Confirma um lote (Inbox: "Aprovar N" / "Dar ciência N"). No mock devolve os ids
 * afetados; o hook marca como confirmados/cientes localmente. No BE:
 * POST /v1/prazos/confirm-batch.
 */
export async function confirmarLote(ids: string[]): Promise<string[]> {
  return espera(ids);
}
