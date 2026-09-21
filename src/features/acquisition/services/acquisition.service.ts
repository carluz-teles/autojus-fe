import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CaptureRunView,
  CreateImportInput,
  ManualImportResult,
} from "../types";

const ENDPOINT = "/v1/acquisition/imports";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi). Não conhece
// React nem cache. O 200 (já existe) e o 202 (novo) trazem o mesmo ManualImportResult — a
// distinção vem do campo `already_imported`, não do status HTTP.

/** Dispara/idempotentemente resolve a importação de um processo por CNJ (ADMIN). */
export async function createImport(
  fetcher: ApiFetcher,
  body: CreateImportInput,
): Promise<ManualImportResult> {
  return fetcher<ManualImportResult>(ENDPOINT, { method: "POST", body });
}

/** Consulta o estado do capture_run da importação (polling até status terminal). */
export async function getImport(
  fetcher: ApiFetcher,
  id: string,
): Promise<CaptureRunView> {
  return fetcher<CaptureRunView>(`${ENDPOINT}/${id}`);
}
