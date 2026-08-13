// Espelha os read/write models de documento do BE (slice internal/document, Fatia 1).
//   GET  /v1/processos/:id/documentos  → PageEnvelope<DocumentView>   (aba Documentos)
//   POST /v1/documentos                → StartUploadResult             (passo 1: pede URL)
//   POST /v1/documentos/:id/complete   → DocumentView                  (passo 3: confirma)
//   GET  /v1/documentos/:id/download   → DownloadUrlResult             (presigned GET)
//   GET  /v1/documentos/:id            → DocumentView                  (detalhe)
//   DELETE /v1/documentos/:id          → 204                           (soft, só UPLOAD)

// Saga do documento — o estado caminha PENDING→UPLOADED→EXTRACTING→EXTRACTED→CHUNKED→
// READY (ou FAILED). Na Fatia 1 o doc para em UPLOADED (o pipeline chega no Bloco C).
export type DocumentStatus =
  | "PENDING"
  | "UPLOADED"
  | "EXTRACTING"
  | "EXTRACTED"
  | "CHUNKED"
  | "READY"
  | "FAILED";

/** COURT = dos autos (peso probatório); UPLOAD = enviado pelo advogado. */
export type DocumentOrigin = "COURT" | "UPLOAD";

// Documento (o que a aba lista/mostra).
export interface DocumentView {
  id: string;
  /** null em upload avulso (sem processo). */
  court_record_id?: string;
  document_type: string;
  origin: DocumentOrigin;
  title: string;
  original_filename?: string;
  mime_type?: string;
  size_bytes?: number;
  pages?: number;
  status: DocumentStatus;
  has_text_layer: boolean;
  checksum?: string;
  /** RFC3339. */
  created_at: string;
}

// ── Upload presigned (3 passos) ──
/** Passo 1 — corpo do POST /v1/documentos (sem tenant_id/org_id: o BE resolve pelo JWT). */
export interface StartUploadInput {
  court_record_id?: string;
  document_type: string;
  title?: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}

/** Passo 1 — resposta: a URL presigned de PUT + o id do documento (nasce PENDING). */
export interface StartUploadResult {
  document_id: string;
  upload_url: string;
  storage_key: string;
  /** validade da URL em segundos. */
  expires_in: number;
}

/** Passo 3 — corpo do POST /:id/complete. checksum (sha256) é opcional. */
export interface CompleteUploadInput {
  checksum?: string;
}

/** GET /:id/download — presigned GET de TTL curto para visualizar/baixar. */
export interface DownloadUrlResult {
  url: string;
  expires_in: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
