import type { ApiFetcher } from "@/lib/api/use-api";

import type { ReconciliationsView } from "../types";

// Read model de reconciliações (contrato definido no FE primeiro; a fatia de BE
// que serve GET /v1/acquisition/reconciliations vem em seguida). Sem React aqui.
export function getReconciliations(
  fetcher: ApiFetcher,
): Promise<ReconciliationsView> {
  return fetcher<ReconciliationsView>("/v1/acquisition/reconciliations");
}
