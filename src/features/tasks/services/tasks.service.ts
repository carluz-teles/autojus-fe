import type { ApiFetcher } from "@/lib/api/use-api";

import type { PageEnvelope, TaskStatus, TaskView } from "../types";

const ENDPOINT = "/v1/tasks";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook. Espelha
// prazos.service.ts.

export interface ListTasksParams {
  /** Filtra pelo status da tarefa (server-side). Omitido = todos. */
  status?: TaskStatus;
  /** Id interno do responsável — base do filtro "meus". Omitido = de todos. */
  assignee?: string;
  /** Janela de vencimento (RFC3339). Omitidas = sem recorte. */
  from?: string;
  to?: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

/** Agenda global — as tarefas do tenant, filtráveis por status/responsável. */
export async function listTasks(
  fetcher: ApiFetcher,
  { status, assignee, from, to, limit = 20, cursor }: ListTasksParams = {},
): Promise<PageEnvelope<TaskView>> {
  return fetcher<PageEnvelope<TaskView>>(ENDPOINT, {
    query: { status, assignee, from, to, limit, cursor },
  });
}

export interface ListTasksByProcessoParams {
  processoId: string;
  limit?: number;
  cursor?: string;
}

/** Aba do processo — tarefas vinculadas ao court_record daquele processo. */
export async function listTasksByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListTasksByProcessoParams,
): Promise<PageEnvelope<TaskView>> {
  return fetcher<PageEnvelope<TaskView>>(`/v1/processos/${processoId}/tasks`, {
    query: { limit, cursor },
  });
}

/** Conclui a tarefa (idempotente no BE — re-concluir é inofensivo). */
export async function markTaskDone(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}/done`, { method: "POST" });
}

/** Dispensa a tarefa (não se aplica / descartada). */
export async function dismissTask(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}/dismiss`, { method: "POST" });
}
