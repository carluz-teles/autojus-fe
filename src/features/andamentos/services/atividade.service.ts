import type { PageEnvelope } from "@/lib/api/types";
import type { ApiFetcher } from "@/lib/api/use-api";

import type { AtividadeDoEscritorioView } from "../types";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook.

export interface ListAtividadeDoProcessoParams {
  processoId: string;
  limit?: number;
  /** Cursor opaco: eco do next_cursor recebido para pedir a próxima página. */
  cursor?: string;
}

export async function listAtividadeDoProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListAtividadeDoProcessoParams,
): Promise<PageEnvelope<AtividadeDoEscritorioView>> {
  return fetcher<PageEnvelope<AtividadeDoEscritorioView>>(
    `/v1/processos/${processoId}/activity`,
    { query: { limit, cursor } },
  );
}
