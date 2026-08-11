import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  ReconciliationDetailView,
  ReconciliationsView,
  SyncRunItemsView,
} from "../types";

// Read model de reconciliações. Sem React aqui — só as chamadas HTTP.

// Lista de guarda-chuvas (uma importação por card).
export function getReconciliations(
  fetcher: ApiFetcher,
): Promise<ReconciliationsView> {
  return fetcher<ReconciliationsView>("/v1/acquisition/reconciliations");
}

// Detalhe de uma importação: o guarda-chuva + suas janelas (sync_run).
export function getReconciliationDetail(
  fetcher: ApiFetcher,
  jobId: string,
): Promise<ReconciliationDetailView> {
  return fetcher<ReconciliationDetailView>(
    `/v1/acquisition/reconciliations/${jobId}`,
  );
}

// Itens que uma janela trouxe (collapse): processos + intimações.
export function getSyncRunItems(
  fetcher: ApiFetcher,
  syncRunId: string,
): Promise<SyncRunItemsView> {
  return fetcher<SyncRunItemsView>(
    `/v1/acquisition/sync-runs/${syncRunId}/items`,
  );
}
