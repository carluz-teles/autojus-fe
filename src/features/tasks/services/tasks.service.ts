import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  PageEnvelope,
  TaskDetailView,
  TaskItemView,
  TasksSummary,
  TaskStatus,
  TaskView,
} from "../types";

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

/**
 * Contadores da agenda — GET /v1/tasks/summary → objeto único (sem envelope de
 * cursor), nos buckets do display_status. Alimenta a KpiRow do topo da tela.
 */
export async function getTasksSummary(
  fetcher: ApiFetcher,
): Promise<TasksSummary> {
  return fetcher<TasksSummary>(`${ENDPOINT}/summary`);
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

/**
 * Detalhe individual — GET /v1/tasks/:id → TaskDetailView (campos da tarefa +
 * checklist `items`, `progress` e `display_status`) ou 404 (ApiError
 * kind=ENTITY_NOT_FOUND). O deep-link busca por id quando a tarefa não está nas
 * páginas carregadas.
 */
export async function getTask(
  fetcher: ApiFetcher,
  id: string,
): Promise<TaskDetailView> {
  return fetcher<TaskDetailView>(`${ENDPOINT}/${id}`);
}

/**
 * Alterna/renomeia um item do checklist — PATCH /v1/tasks/:id/items/:itemId. Campos
 * ausentes mantêm o valor no BE (Title/Done são opcionais). Devolve o item atualizado.
 */
export async function patchTaskItem(
  fetcher: ApiFetcher,
  taskId: string,
  itemId: string,
  patch: { done?: boolean; title?: string },
): Promise<TaskItemView> {
  return fetcher<TaskItemView>(`${ENDPOINT}/${taskId}/items/${itemId}`, {
    method: "PATCH",
    body: patch,
  });
}

/** Adiciona um item ao checklist — POST /v1/tasks/:id/items → item criado. */
export async function createTaskItem(
  fetcher: ApiFetcher,
  taskId: string,
  title: string,
): Promise<TaskItemView> {
  return fetcher<TaskItemView>(`${ENDPOINT}/${taskId}/items`, {
    method: "POST",
    body: { title },
  });
}

/** Remove um item do checklist — DELETE /v1/tasks/:id/items/:itemId. */
export async function deleteTaskItem(
  fetcher: ApiFetcher,
  taskId: string,
  itemId: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${taskId}/items/${itemId}`, {
    method: "DELETE",
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
