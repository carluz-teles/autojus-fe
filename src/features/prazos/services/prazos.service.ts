import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  PageEnvelope,
  PrazoAgendaView,
  PrazoApurarDivergenciaInput,
  PrazoApurarDivergenciaResult,
  PrazoApurarTipoInput,
  PrazoApurarTipoResult,
  PrazoConfirmInput,
  PrazoConfirmResult,
  PrazoDetalheView,
  PrazoPreviewInput,
  PrazoPreviewResult,
  PrazosSummary,
  PrazoStatus,
  PrazoView,
  SuggestedTasksResult,
} from "../types";

const ENDPOINT = "/v1/prazos";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook. Espelha
// processos.service.ts / intimacoes.service.ts.

export interface ListPrazosByProcessoParams {
  processoId: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

/** Aba do processo — prazos calculados a partir das intimações daquele processo. */
export async function listPrazosByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListPrazosByProcessoParams,
): Promise<PageEnvelope<PrazoView>> {
  return fetcher<PageEnvelope<PrazoView>>(
    `/v1/processos/${processoId}/prazos`,
    { query: { limit, cursor } },
  );
}

export interface ListPrazosParams {
  /** Filtra pelo status do prazo (server-side). Omitido = todos. */
  status?: PrazoStatus;
  /** Janela de vencimento (RFC3339). Omitidas = sem recorte. */
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/** Agenda global — próximos vencimentos do tenant. */
export async function listPrazos(
  fetcher: ApiFetcher,
  { status, from, to, limit = 20, cursor }: ListPrazosParams = {},
): Promise<PageEnvelope<PrazoAgendaView>> {
  return fetcher<PageEnvelope<PrazoAgendaView>>(ENDPOINT, {
    query: { status, from, to, limit, cursor },
  });
}

/** Detalhe individual — o "por quê" do cálculo (start_date, days, source, regras). */
export async function getPrazo(
  fetcher: ApiFetcher,
  id: string,
): Promise<PrazoDetalheView> {
  return fetcher<PrazoDetalheView>(`${ENDPOINT}/${id}`);
}

/**
 * F2 — o prazo (0 ou 1) derivado de uma intimação. O BE devolve um PageEnvelope
 * filtrado por intimation_id; pegamos o primeiro (ou null quando ainda não derivou).
 */
export async function getPrazoPorIntimacao(
  fetcher: ApiFetcher,
  intimationId: string,
): Promise<PrazoAgendaView | null> {
  const page = await fetcher<PageEnvelope<PrazoAgendaView>>(ENDPOINT, {
    query: { intimation_id: intimationId, limit: 1 },
  });
  return page.data[0] ?? null;
}

/**
 * Contadores da agenda — GET /v1/prazos/summary → objeto único (sem envelope de
 * cursor). Alimenta a KpiRow do topo da tela.
 */
export async function getPrazosSummary(
  fetcher: ApiFetcher,
): Promise<PrazosSummary> {
  return fetcher<PrazosSummary>(`${ENDPOINT}/summary`);
}

/** F2 — "Aprovar tudo": abre o prazo (PENDING→OPEN) e cria as tarefas numa tacada. */
export async function confirmarPrazo(
  fetcher: ApiFetcher,
  body: PrazoConfirmInput,
): Promise<PrazoConfirmResult> {
  return fetcher<PrazoConfirmResult>(`${ENDPOINT}/confirm`, {
    method: "POST",
    body,
  });
}

/** Tarefas sugeridas por LLM para pré-preencher o F2 (on-demand; só custa ao abrir). */
export async function getSuggestedTasks(
  fetcher: ApiFetcher,
  prazoId: string,
): Promise<SuggestedTasksResult> {
  return fetcher<SuggestedTasksResult>(
    `${ENDPOINT}/${prazoId}/suggested-tasks`,
  );
}

/**
 * Preview ao vivo — recalcula o vencimento sem persistir.
 * POST /v1/prazos/preview → PrazoPreviewResult. Chamado com debounce ~300ms
 * enquanto o advogado ajusta dias/anchor/feriado no form de edição.
 */
export async function previewPrazo(
  fetcher: ApiFetcher,
  body: PrazoPreviewInput,
): Promise<PrazoPreviewResult> {
  return fetcher<PrazoPreviewResult>(`${ENDPOINT}/preview`, {
    method: "POST",
    body,
  });
}

/**
 * Declara mera ciência — POST /v1/prazos/:id/no-deadline (sem corpo).
 * Transição: qualquer status → NO_DEADLINE.
 */
export async function noDeadlinePrazo(
  fetcher: ApiFetcher,
  prazoId: string,
): Promise<void> {
  return fetcher<void>(`${ENDPOINT}/${prazoId}/no-deadline`, {
    method: "POST",
  });
}

/**
 * Reabre o prazo declarado como mera ciência — POST /v1/prazos/:id/reopen (sem corpo).
 * Transição: NO_DEADLINE → PENDING.
 */
export async function reopenPrazo(
  fetcher: ApiFetcher,
  prazoId: string,
): Promise<void> {
  return fetcher<void>(`${ENDPOINT}/${prazoId}/reopen`, {
    method: "POST",
  });
}

/**
 * V1 — resolve a divergência declarado × calculado (memória de cálculo).
 * POST /v1/prazos/:id/apurar-divergencia → selo vira "confiavel".
 */
export async function apurarDivergenciaPrazo(
  fetcher: ApiFetcher,
  prazoId: string,
  body: PrazoApurarDivergenciaInput,
): Promise<PrazoApurarDivergenciaResult> {
  return fetcher<PrazoApurarDivergenciaResult>(
    `${ENDPOINT}/${prazoId}/apurar-divergencia`,
    { method: "POST", body },
  );
}

/**
 * V1 — confirma ou reclassifica o tipo inferido por IA (memória de cálculo).
 * POST /v1/prazos/:id/apurar-tipo → selo vira "confiavel".
 */
export async function apurarTipoPrazo(
  fetcher: ApiFetcher,
  prazoId: string,
  body: PrazoApurarTipoInput,
): Promise<PrazoApurarTipoResult> {
  return fetcher<PrazoApurarTipoResult>(`${ENDPOINT}/${prazoId}/apurar-tipo`, {
    method: "POST",
    body,
  });
}
