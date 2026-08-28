import type { PageEnvelope } from "@/lib/api/types";
import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  AttachDocumentInput,
  GeneratePecaBody,
  PecaAttachment,
  PecaChatMessage,
  PecaChatThread,
  PecaCreated,
  PecaDetail,
  PecaExportResult,
  PecaFileResult,
  PecaListItem,
  PecaPatchResult,
  PecaResultResult,
  PecaReviewResult,
  PecaSignResult,
  ThesesResponse,
  UpdateAttachmentCategoryInput,
} from "../types";

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

// ── Fatia 4: peticionamento ──────────────────────────────────────────────────

export interface ListPecasParams {
  /** Filtra por piece_type (DEFENSE, APPEAL, PETITION, ...). */
  piece_type?: string;
  /** Filtra por status (DRAFT, SIGNED, FILED, DISCARDED). */
  status?: string;
  /** Chip do FE: "aguardando_assinatura" | "aguardando_protocolo". */
  workflow_state?: string;
  /** Chip do FE: "atraso" | "hoje" (contra deadline da intimação de origem). */
  urgencia?: string;
  /** Chip "Minhas": "me" (autor = usuário logado) ou um user id. */
  assignee?: string;
  limit?: number;
  cursor?: string;
}

/** Lista todas as peças do tenant — GET /v1/pecas (paginação por cursor). */
export async function listPecas(
  fetcher: ApiFetcher,
  {
    piece_type,
    status,
    workflow_state,
    urgencia,
    assignee,
    limit = 20,
    cursor,
  }: ListPecasParams = {},
): Promise<PageEnvelope<PecaListItem>> {
  return fetcher<PageEnvelope<PecaListItem>>(ENDPOINT, {
    query: {
      piece_type,
      status,
      workflow_state,
      urgencia,
      assignee,
      limit,
      cursor,
    },
  });
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

/** Assina a peça — POST /v1/pecas/:id/sign (body vazio). */
export async function signPeca(
  fetcher: ApiFetcher,
  id: string,
): Promise<PecaSignResult> {
  const res = await fetcher<DataEnvelope<PecaSignResult>>(
    `${ENDPOINT}/${id}/sign`,
    { method: "POST" },
  );
  return res.data;
}

export interface FilePecaParams {
  /** JSON livre do comprovante de protocolo. */
  receipt?: Record<string, unknown>;
  /** court_record_id — resolvido pelo BE se omitido. */
  court_record_id?: string;
  /** Timestamp do protocolo (RFC3339). */
  filed_at?: string;
}

/** Protocola a peça — POST /v1/pecas/:id/file. */
export async function filePeca(
  fetcher: ApiFetcher,
  id: string,
  params: FilePecaParams = {},
): Promise<PecaFileResult> {
  const res = await fetcher<DataEnvelope<PecaFileResult>>(
    `${ENDPOINT}/${id}/file`,
    { method: "POST", body: params },
  );
  return res.data;
}

/** Registra o resultado observado — PATCH /v1/pecas/:id/result. */
export async function updateResult(
  fetcher: ApiFetcher,
  id: string,
  observedResult: string,
): Promise<PecaResultResult> {
  const res = await fetcher<DataEnvelope<PecaResultResult>>(
    `${ENDPOINT}/${id}/result`,
    { method: "PATCH", body: { observed_result: observedResult } },
  );
  return res.data;
}

/** Exporta a peça — GET /v1/pecas/:id/export?format=docx|pdf. */
export async function exportPeca(
  fetcher: ApiFetcher,
  id: string,
  format: "docx" | "pdf" = "docx",
): Promise<PecaExportResult> {
  return fetcher<PecaExportResult>(`${ENDPOINT}/${id}/export`, {
    query: { format },
  });
}

// ── Fatia 2: anexos ───────────────────────────────────────────────────────────

/**
 * Vincula um documento já UPLOADED à peça.
 * POST /v1/pecas/:id/anexos → { data: PecaAttachment }
 * 409 = já vinculado; 422 = PENDING/COURT/categoria inválida.
 */
export async function attachDocument(
  fetcher: ApiFetcher,
  id: string,
  input: AttachDocumentInput,
): Promise<PecaAttachment> {
  const res = await fetcher<DataEnvelope<PecaAttachment>>(
    `${ENDPOINT}/${id}/anexos`,
    { method: "POST", body: input },
  );
  return res.data;
}

/** Categoriza um anexo — PATCH /v1/pecas/:id/anexos/:attachmentId. */
export async function updateAttachmentCategory(
  fetcher: ApiFetcher,
  id: string,
  attachmentId: string,
  input: UpdateAttachmentCategoryInput,
): Promise<PecaAttachment> {
  const res = await fetcher<DataEnvelope<PecaAttachment>>(
    `${ENDPOINT}/${id}/anexos/${attachmentId}`,
    { method: "PATCH", body: input },
  );
  return res.data;
}

/** Remove o vínculo do anexo — DELETE /v1/pecas/:id/anexos/:attachmentId (204). */
export async function removeAttachment(
  fetcher: ApiFetcher,
  id: string,
  attachmentId: string,
): Promise<void> {
  await fetcher<void>(`${ENDPOINT}/${id}/anexos/${attachmentId}`, {
    method: "DELETE",
  });
}

// ── Fatia 3: revisão IA ──────────────────────────────────────────────────────

/** Dispara revisão IA da peça — POST /v1/pecas/:id/review (body vazio). */
export async function triggerReview(
  fetcher: ApiFetcher,
  id: string,
): Promise<PecaReviewResult> {
  const res = await fetcher<DataEnvelope<PecaReviewResult>>(
    `${ENDPOINT}/${id}/review`,
    { method: "POST" },
  );
  return res.data;
}

// ── Fatia 3b: chat ancorado ──────────────────────────────────────────────────

/** Busca o thread de chat da peça — GET /v1/pecas/:id/chat. */
export async function getChatThread(
  fetcher: ApiFetcher,
  id: string,
): Promise<PecaChatThread> {
  const res = await fetcher<DataEnvelope<PecaChatThread>>(
    `${ENDPOINT}/${id}/chat`,
  );
  return res.data;
}

/** Envia uma pergunta no chat — POST /v1/pecas/:id/chat. */
export async function sendChatMessage(
  fetcher: ApiFetcher,
  id: string,
  question: string,
): Promise<PecaChatMessage> {
  const res = await fetcher<DataEnvelope<PecaChatMessage>>(
    `${ENDPOINT}/${id}/chat`,
    { method: "POST", body: { question } },
  );
  return res.data;
}

// ── Fatia: teses / tom / instruções (tela de partida) ───────────────────────

/** Sugere teses — POST /v1/pecas/:id/theses (sem body). */
export async function getTheses(
  fetcher: ApiFetcher,
  id: string,
): Promise<ThesesResponse> {
  const res = await fetcher<DataEnvelope<ThesesResponse>>(
    `${ENDPOINT}/${id}/theses`,
    { method: "POST" },
  );
  return res.data;
}

/** Sugere teses ANTES da peça existir — POST /v1/theses. Usado pela tela
 *  /pecas/nova (Partida ephemeral) — evita criar draft zumbi só pra ver teses. */
export async function getThesesFromIntimation(
  fetcher: ApiFetcher,
  params: { intimation_id: string; piece_type: string },
): Promise<ThesesResponse> {
  const res = await fetcher<DataEnvelope<ThesesResponse>>("/v1/theses", {
    method: "POST",
    body: params,
  });
  return res.data;
}

/** Gera peça — POST /v1/pecas/:id/generate com body opcional. */
export async function generatePeca(
  fetcher: ApiFetcher,
  id: string,
  body: GeneratePecaBody = {},
): Promise<{ id: string; saga_state: string }> {
  const res = await fetcher<DataEnvelope<{ id: string; saga_state: string }>>(
    `${ENDPOINT}/${id}/generate`,
    { method: "POST", body },
  );
  return res.data;
}
