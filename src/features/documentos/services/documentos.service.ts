import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CompleteUploadInput,
  DocumentView,
  DownloadUrlResult,
  PageEnvelope,
  StartUploadInput,
  StartUploadResult,
} from "../types";

const ENDPOINT = "/v1/documentos";

// Camada de rede da feature: recebe o fetcher (ligado ao Clerk pelo useApi). Não conhece
// React nem cache — isso é do hook. Espelha prazos.service.ts / processos.service.ts.

export interface ListDocumentosByProcessoParams {
  processoId: string;
  limit?: number;
  cursor?: string;
}

/** Aba do processo — documentos ancorados no court_record (`:id` = id do processo). */
export async function listDocumentosByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 100, cursor }: ListDocumentosByProcessoParams,
): Promise<PageEnvelope<DocumentView>> {
  return fetcher<PageEnvelope<DocumentView>>(
    `/v1/processos/${processoId}/documentos`,
    { query: { limit, cursor } },
  );
}

/** Passo 1 do upload presigned — cria o documento PENDING e devolve a URL de PUT. */
export async function startUpload(
  fetcher: ApiFetcher,
  body: StartUploadInput,
): Promise<StartUploadResult> {
  return fetcher<StartUploadResult>(ENDPOINT, { method: "POST", body });
}

/** Passo 3 — confirma que os bytes chegaram (BE valida no storage) → UPLOADED. */
export async function completeUpload(
  fetcher: ApiFetcher,
  id: string,
  body: CompleteUploadInput = {},
): Promise<DocumentView> {
  return fetcher<DocumentView>(`${ENDPOINT}/${id}/complete`, {
    method: "POST",
    body,
  });
}

/** Presigned GET (TTL curto) para visualizar/baixar. */
export async function getDownloadUrl(
  fetcher: ApiFetcher,
  id: string,
): Promise<DownloadUrlResult> {
  return fetcher<DownloadUrlResult>(`${ENDPOINT}/${id}/download`);
}

/** Exclusão soft (só UPLOAD; o BE rejeita COURT com 409). */
export async function deleteDocumento(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}`, { method: "DELETE" });
}

/**
 * Passo 2 do upload presigned: PUT dos bytes DIRETO no object storage (R2), fora do
 * apiFetch — é o único I/O que não passa pela API (a exceção sancionada do CLAUDE.md:
 * "upload = 3 passos presigned"). Usa XMLHttpRequest (não fetch) porque só ele expõe
 * progresso de upload. O Content-Type tem que casar com o mime assinado no passo 1.
 */
export function putToStorage(
  url: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha ao enviar o arquivo (${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Falha de rede ao enviar o arquivo."));
    xhr.send(file);
  });
}
