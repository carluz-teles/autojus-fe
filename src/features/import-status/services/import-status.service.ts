import type { ApiFetcher } from "@/lib/api/use-api";

// Estado da importação (backfill do onboarding) do tenant, para o banner. Espelha o
// read model do BE (GET /v1/acquisition/import-status). status NONE = nunca importou.
export type ImportStatus = {
  importing: boolean;
  status: "RUNNING" | "COMPLETED" | "PARTIAL" | "NONE";
  total_slices: number;
  slices_ok: number;
  slices_error: number;
};

export function getImportStatus(fetcher: ApiFetcher): Promise<ImportStatus> {
  return fetcher<ImportStatus>("/v1/acquisition/import-status");
}
