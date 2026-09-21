import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CreateLetterheadInput,
  LetterheadListEnvelope,
  LetterheadView,
  StartLetterheadUploadInput,
  StartLetterheadUploadResult,
  UpdateLetterheadInput,
} from "../types";

const ENDPOINT = "/v1/letterheads";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi). Não conhece
// React nem cache — isso é do hook. Espelha documentos.service.ts / processos.service.ts.

/** Lista os papéis timbrados do escritório (default primeiro, depois mais recentes). */
export async function listLetterheads(
  fetcher: ApiFetcher,
): Promise<LetterheadListEnvelope> {
  return fetcher<LetterheadListEnvelope>(ENDPOINT);
}

/** Detalhe individual — inclui `asset_url` (presigned GET) para pré-visualizar o timbre. */
export async function getLetterhead(
  fetcher: ApiFetcher,
  id: string,
): Promise<LetterheadView> {
  return fetcher<LetterheadView>(`${ENDPOINT}/${id}`);
}

/** Passo 1 do upload presigned — pede a URL de PUT e a chave do objeto no storage. */
export async function startLetterheadUpload(
  fetcher: ApiFetcher,
  body: StartLetterheadUploadInput,
): Promise<StartLetterheadUploadResult> {
  return fetcher<StartLetterheadUploadResult>(`${ENDPOINT}/uploads`, {
    method: "POST",
    body,
  });
}

/** Passo 3 — confirma que os bytes chegaram (BE valida no storage) e cria o registro. */
export async function createLetterhead(
  fetcher: ApiFetcher,
  body: CreateLetterheadInput,
): Promise<LetterheadView> {
  return fetcher<LetterheadView>(ENDPOINT, { method: "POST", body });
}

/** Renomeia e/ou ajusta as margens (PATCH parcial). */
export async function updateLetterhead(
  fetcher: ApiFetcher,
  id: string,
  body: UpdateLetterheadInput,
): Promise<LetterheadView> {
  return fetcher<LetterheadView>(`${ENDPOINT}/${id}`, {
    method: "PATCH",
    body,
  });
}

/** Marca como padrão do escritório (troca o anterior atomicamente). */
export async function setDefaultLetterhead(
  fetcher: ApiFetcher,
  id: string,
): Promise<LetterheadView> {
  return fetcher<LetterheadView>(`${ENDPOINT}/${id}/default`, {
    method: "PATCH",
  });
}

/** Remove o registro + objeto (best-effort) → 204. */
export async function deleteLetterhead(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}`, { method: "DELETE" });
}
