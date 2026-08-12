import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  PageEnvelope,
  PrazoAgendaView,
  PrazoConfirmInput,
  PrazoConfirmResult,
  PrazoDetalheView,
  PrazoStatus,
  PrazoView,
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
