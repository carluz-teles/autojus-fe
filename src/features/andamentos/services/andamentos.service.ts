import type { ApiFetcher } from "@/lib/api/use-api";

import type { AndamentoView, PageEnvelope } from "../types";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListAndamentosParams {
  processoId: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

export async function listAndamentosByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListAndamentosParams,
): Promise<PageEnvelope<AndamentoView>> {
  return fetcher<PageEnvelope<AndamentoView>>(
    `/v1/processos/${processoId}/andamentos`,
    { query: { limit, cursor } },
  );
}
