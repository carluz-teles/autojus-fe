import type { ApiFetcher } from "@/lib/api/use-api";

import type { PageEnvelope, ProcessoView } from "../types";

const ENDPOINT = "/v1/processos";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListProcessosParams {
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
  /** Busca server-side por cnj_number (ILIKE). Omitido quando vazio. */
  search?: string;
}

export async function listProcessos(
  fetcher: ApiFetcher,
  { limit = 20, cursor, search }: ListProcessosParams = {},
): Promise<PageEnvelope<ProcessoView>> {
  return fetcher<PageEnvelope<ProcessoView>>(ENDPOINT, {
    query: { limit, cursor, search },
  });
}
