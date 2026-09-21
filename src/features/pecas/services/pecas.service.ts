import { blocksNewFiling } from "@/features/filing/presentation";
import { getFilingAttempt } from "@/features/filing/service";
import type { PageEnvelope } from "@/lib/api/types";
import type { ApiFetcher } from "@/lib/api/use-api";

import type { PecaFileResult, PecaListItem } from "../types";

const ENDPOINT = "/v1/pecas";

// Camada de rede remanescente da feature Peça v1 (o fluxo de peça vive em
// pecas-v2). Sobraram só as duas operações ainda consumidas: listar peças de um
// processo (hub de processo) e registrar protocolo manual (coberto por teste).

/** Envelope { data } que o slice draft usa em POST/GET/PATCH /v1/pecas. */
interface DataEnvelope<T> {
  data: T;
}

export interface ListPecasByProcessoParams {
  processoId: string;
  limit?: number;
  cursor?: string;
}

/** Lista peças de um processo — GET /v1/processos/:id/pecas. */
export async function listPecasByProcesso(
  fetcher: ApiFetcher,
  { processoId, limit = 20, cursor }: ListPecasByProcessoParams,
): Promise<PageEnvelope<PecaListItem>> {
  return fetcher<PageEnvelope<PecaListItem>>(
    `/v1/processos/${processoId}/pecas`,
    { query: { limit, cursor } },
  );
}

export interface FilePecaParams {
  /** JSON livre do comprovante de protocolo. */
  receipt?: Record<string, unknown>;
  /** court_record_id — resolvido pelo BE se omitido. */
  court_record_id?: string;
  /** Timestamp do protocolo (RFC3339). */
  filed_at?: string;
}

/** Registra protocolo manual existente; não envia ao e-SAJ. */
export async function filePeca(
  fetcher: ApiFetcher,
  id: string,
  params: FilePecaParams = {},
): Promise<PecaFileResult> {
  const attempt = await getFilingAttempt(fetcher, id);
  if (blocksNewFiling(attempt)) {
    throw new Error(
      "Já existe uma tentativa de protocolo. Confira o acompanhamento e o recibo no tribunal antes de qualquer novo envio.",
    );
  }
  const res = await fetcher<DataEnvelope<PecaFileResult>>(
    `${ENDPOINT}/${id}/file`,
    { method: "POST", body: params },
  );
  return res.data;
}
