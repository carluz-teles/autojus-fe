import type { ApiFetcher } from "@/lib/api/use-api";

import type {
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
}

export async function listIntimacoes(
  fetcher: ApiFetcher,
  { limit = 20, cursor, search }: ListIntimacoesParams = {},
): Promise<PageEnvelope<IntimacaoView>> {
  return fetcher<PageEnvelope<IntimacaoView>>(ENDPOINT, {
    query: { limit, cursor, search },
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
