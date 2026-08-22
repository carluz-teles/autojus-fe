import type { ApiFetcher } from "@/lib/api/use-api";

import type { PecaCreated, PecaDetail, PecaPatchResult } from "../types";

const ENDPOINT = "/v1/pecas";

// Camada de rede da feature Peça: recebe o fetcher (ligado ao Clerk pelo useApi).
// Não conhece React nem cache — isso é responsabilidade do hook. O slice draft do
// BE envelopa as respostas em { data }, então desembrulhamos aqui (diferente do
// GET /v1/intimacoes/:id, que devolve o objeto direto).

/** Envelope { data } que o slice draft usa em POST/GET/PATCH /v1/pecas. */
interface DataEnvelope<T> {
  data: T;
}

/** Detalhe da peça — GET /v1/pecas/:id → PecaDetail (rascunho + contexto da
 *  intimação/processo/prazo/anexos) ou 404 (ApiError kind=ENTITY_NOT_FOUND). */
export async function getPeca(
  fetcher: ApiFetcher,
  id: string,
): Promise<PecaDetail> {
  const res = await fetcher<DataEnvelope<PecaDetail>>(`${ENDPOINT}/${id}`);
  return res.data;
}

/** Autosave do rascunho — PATCH /v1/pecas/:id { content, title? }. Devolve só o
 *  patch (id, title, updated_at) para o rótulo "Rascunho salvo há …". */
export async function salvarRascunho(
  fetcher: ApiFetcher,
  id: string,
  content: string,
  title?: string,
): Promise<PecaPatchResult> {
  const res = await fetcher<DataEnvelope<PecaPatchResult>>(
    `${ENDPOINT}/${id}`,
    { method: "PATCH", body: { content, title } },
  );
  return res.data;
}

export interface CriarPecaParams {
  /** intimation | processo | blank — origem do rascunho. */
  source: string;
  intimation_id?: string;
  case_id?: string;
  piece_type?: string;
  title?: string;
}

/** Cria (ou reaproveita, idempotente por intimação) um rascunho — POST /v1/pecas. */
export async function criarPeca(
  fetcher: ApiFetcher,
  params: CriarPecaParams,
): Promise<PecaCreated> {
  const res = await fetcher<DataEnvelope<PecaCreated>>(ENDPOINT, {
    method: "POST",
    body: params,
  });
  return res.data;
}
