import type { ApiFetcher } from "@/lib/api/use-api";

import type { IntimacaoView, PageEnvelope } from "../types";

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

/**
 * Detalhe individual — GET /v1/intimacoes/:id → IntimacaoView (mesma forma do
 * item da lista) ou 404 (ApiError kind=ENTITY_NOT_FOUND). Espelha getPrazo:
 * o deep-link busca por id quando a intimação não está nas páginas carregadas.
 */
export async function getIntimacao(
  fetcher: ApiFetcher,
  id: string,
): Promise<IntimacaoView> {
  return fetcher<IntimacaoView>(`${ENDPOINT}/${id}`);
}
