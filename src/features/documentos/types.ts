// Espelha os read/write models de documento do BE (slice internal/document, Fatia 1).
//   GET  /v1/processos/:id/documentos  → PageEnvelope<DocumentView>   (aba Documentos)
//   POST /v1/documentos                → StartUploadResult             (passo 1: pede URL)
//   POST /v1/documentos/:id/complete   → DocumentView                  (passo 3: confirma)
//   GET  /v1/documentos/:id/download   → DownloadUrlResult             (presigned GET)
//   GET  /v1/documentos/:id            → DocumentView                  (detalhe)
//   DELETE /v1/documentos/:id          → 204                           (soft, só UPLOAD)

// Saga do documento — o estado caminha PENDING→UPLOADED→EXTRACTING→EXTRACTED→CHUNKED→
// READY (ou FAILED). Na Fatia 1 o doc para em UPLOADED (o pipeline chega no Bloco C).
type DocumentStatus =
  | "PENDING"
  | "UPLOADED"
  | "EXTRACTING"
  | "EXTRACTED"
  | "CHUNKED"
  | "READY"
  | "FAILED";

/** COURT = dos autos (peso probatório); UPLOAD = enviado pelo advogado. */
type DocumentOrigin = "COURT" | "UPLOAD";

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
  /** RFC3339 — data de CAPTURA do documento (ingestão), não a data do ato. */
  created_at: string;
  /**
   * RFC3339 — data JURÍDICA do ato (document.court_event_date). Ausente/null quando
   * desconhecida (UPLOAD humano, ou doc COURT capturado antes da coluna existir). É a
   * data pela qual os autos são identificados; quando ausente, a UI cai para `created_at`
   * rotulada como data de captura, nunca apresentada como data do ato.
   */
  court_event_date?: string | null;
  /** Vínculo confirmado pelo tribunal; ausente em uploads e autos legados. */
  autos_event_id?: string;
  court_document_code?: string;
  source_system?: string;
  logical_doc_ref?: string;
  external_page?: number;
  court_reference?: CourtReference;
}

export interface CourtReference {
  event_number?: number;
  document_code: string;
  source_system?: string;
  reference_kind?: string;
  logical_doc_ref?: string;
  unit_index?: number;
  page_count?: number;
  folio_start?: number;
  folio_end?: number;
  numbering_scope?: "PROCESS" | "DOCUMENT";
  folio_verified?: boolean;
}

export interface AutosUnavailableDocument {
  external_ref: string;
  external_page: number;
  court_document_code?: string;
  court_document_order?: number;
  portal_mime_type?: string;
  reason: string;
  page_count?: number;
  folio_start?: number;
  folio_end?: number;
  numbering_scope?: "PROCESS" | "DOCUMENT";
  folio_verified?: boolean;
}

export interface AutosNode {
  kind: "event" | "document" | "unmapped";
  id: string;
  event_number?: number;
  source_system?: string;
  reference_kind?: string;
  external_group_ref?: string;
  group_scope?: string;
  occurred_at?: string;
  description?: string;
  detail?: string;
  actor?: string;
  documents: DocumentView[];
  unavailable_documents?: AutosUnavailableDocument[];
  unavailable_count?: number;
}

export interface AutosTreePage {
  data: AutosNode[];
  page: {
    next_cursor: string | null;
    limit: number;
    total_count: number;
    total: number;
  };
  filters: Record<string, never>;
  document_total: number;
  document_filtered_total: number;
  unavailable_total?: number;
  unavailable_filtered_total?: number;
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
