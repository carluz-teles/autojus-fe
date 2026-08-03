import type { ApiFetcher } from "@/lib/api/use-api";

import type { IntimacaoView, PageEnvelope } from "../types";

const ENDPOINT = "/v1/intimacoes";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListIntimacoesParams {
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

export async function listIntimacoes(
  fetcher: ApiFetcher,
  { limit = 20, cursor }: ListIntimacoesParams = {},
): Promise<PageEnvelope<IntimacaoView>> {
  return fetcher<PageEnvelope<IntimacaoView>>(ENDPOINT, {
    query: { limit, cursor },
  });
}
