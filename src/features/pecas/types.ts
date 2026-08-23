// Contrato de rede da feature Peça — espelha o wire do slice draft do BE
// (GET/POST/PATCH /v1/pecas). O BADGE de status/versão da UI ("Rascunho v1") deriva
// destes campos; nada aqui é mock.

/** saga_state do rascunho: pipeline de geração/revisão (débito das próximas frentes). */
export type PecaSagaState =
  "CREATED" | "EXTRACTING" | "DRAFTED" | "REVIEWED" | "FAILED";

/** status do ciclo de vida da peça (v0: só DRAFT é persistido nesta frente). */
export type PecaStatus = "DRAFT" | "SIGNED" | "FILED" | "DISCARDED";

/** Contexto da intimação de origem, embutido no detalhe da peça. Null quando a peça
 *  nasceu em branco/de processo (sem intimação). */
export interface PecaIntimation {
  id: string;
  type: string;
  content: string;
  made_available_at: string;
  deadline_start_at: string;
}

/** Contexto do processo (via court_record), incluindo partes e valor da causa
 *  (Task 2a). plaintiffs/defendants nunca são null (array vazio quando sem partes). */
export interface PecaProcess {
  case_id: string;
  court_record_id: string;
  cnj_number: string;
  court: string;
  degree: string;
  class: string;
  subject: string;
  judging_body: string;
  /** valor da causa como decimal em string (ex. "15000.00"), "" quando ausente. */
  claim_value: string;
  /** autor / polo ativo. */
  plaintiffs: string[];
  /** réu / polo passivo. */
  defendants: string[];
}

/** Prazo derivado da intimação (via deadline). Null quando não há prazo ainda. */
export interface PecaDeadline {
  id: string;
  end_date: string;
  days_left: number;
  status: string;
}

/** Categorias válidas de anexo — closed set espelhado de AttachmentCategory no BE. */
export type AttachmentCategory =
  | "Procuração"
  | "Comprovante de endereço"
  | "Contrato"
  | "Provas documentais"
  | "Declaração de hipossuficiência"
  | "Outro";

export const ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  "Procuração",
  "Comprovante de endereço",
  "Contrato",
  "Provas documentais",
  "Declaração de hipossuficiência",
  "Outro",
];

/** Body do POST /v1/pecas/:id/anexos. */
export interface AttachDocumentInput {
  document_id: string;
  category?: AttachmentCategory;
}

/** Body do PATCH /v1/pecas/:id/anexos/:attachmentId. */
export interface UpdateAttachmentCategoryInput {
  category: AttachmentCategory;
}

/** Anexo linkado à peça — GET /v1/pecas/:id retorna attachments: [] (nunca null). */
export interface PecaAttachment {
  id: string;
  document_id: string;
  name: string;
  category: AttachmentCategory;
  mime_type: string;
  size_bytes: number;
  status: string;
  position: number;
  created_at: string;
}

/** Detalhe da peça — GET /v1/pecas/:id (dentro do envelope { data }). */
export interface PecaDetail {
  id: string;
  piece_type: string;
  title: string;
  content: string;
  status: string;
  saga_state: string;
  created_at: string;
  updated_at: string;
  intimation: PecaIntimation | null;
  process: PecaProcess | null;
  deadline: PecaDeadline | null;
  attachments: PecaAttachment[];
  review: PecaReview | null;
}

/** Resposta do PATCH /v1/pecas/:id (autosave) — só os campos que mudaram. */
export interface PecaPatchResult {
  id: string;
  title: string;
  updated_at: string;
}

/** Resposta do POST /v1/pecas (criação/idempotente). */
export interface PecaCreated {
  id: string;
  tenant_id: string;
  case_id?: string;
  intimation_id?: string;
  piece_type: string;
  title: string;
  content: string | null;
  status: string;
  saga_state: string;
  created_at: string;
  updated_at: string;
}

// ── Fatia 4: peticionamento ──────────────────────────────────────────────────

/** Item da lista paginada — GET /v1/pecas ou GET /v1/processos/:id/pecas. */
export interface PecaListItem {
  id: string;
  piece_type: string;
  title: string;
  status: string;
  saga_state: string;
  coverage_summary: PecaCoverageSummary | null;
  filed_at: string | null;
  observed_result: string | null;
  created_at: string;
}

/** Coverage summary do review (grounded/chunks/suggestions). */
export interface PecaCoverageSummary {
  grounded: boolean;
  chunks_used: number;
  suggestions_total: number;
}

/** Resposta do POST /v1/pecas/:id/sign. */
export interface PecaSignResult {
  id: string;
  status: string;
  signed_at: string;
}

/** Resposta do POST /v1/pecas/:id/file. */
export interface PecaFileResult {
  petition_id: string;
  draft_id: string;
  filed_at: string;
  receipt: Record<string, unknown>;
}

/** Resposta do PATCH /v1/pecas/:id/result. */
export interface PecaResultResult {
  petition_id: string;
  observed_result: string;
}

/** Resposta do GET /v1/pecas/:id/export. */
export interface PecaExportResult {
  url: string;
  expires_in: number;
}

// ── Fatia 3: revisão IA (sugestões) ──────────────────────────────────────────

/** Citation — âncora de um finding a um documento do processo. */
export interface PecaCitation {
  document_id: string;
  page: number;
  quote: string;
}

/** Finding — uma sugestão de revisão mapeada a um trecho do rascunho. */
export interface PecaFinding {
  n: number;
  category: string;
  original: string;
  replacement: string;
  problem: string;
  description: string;
  citation: PecaCitation | null;
}

/** Coverage — resumo do grounding e filtragem de uma revisão. */
export interface PecaCoverage {
  grounded: boolean;
  chunks_used: number;
  suggestions_total: number;
  suggestions_dropped: number;
  documents_cited: string[];
  error?: string;
}

/** Review — parecer IA completo de uma peça. */
export interface PecaReview {
  id: string;
  draft_id: string;
  findings: PecaFinding[];
  coverage: PecaCoverage;
  model_version: string;
  rules_version: string;
  status: string;
  generated_at: string;
  created_at: string;
}

/** Resposta do POST /v1/pecas/:id/review. */
export interface PecaReviewResult {
  review: PecaReview;
  saga_state: string;
}

// ── Fatia 3b: chat ancorado ──────────────────────────────────────────────────

/** ChatMessage — uma mensagem no thread de chat da peça. */
export interface PecaChatMessage {
  id: string;
  draft_id: string;
  role: string;
  content: string;
  citations: PecaCitation[];
  grounded: boolean;
  model_version?: string;
  created_at: string;
}

/** Resposta do GET /v1/pecas/:id/chat. */
export interface PecaChatThread {
  messages: PecaChatMessage[];
  grounded_capable: boolean;
}

/** Resposta do POST /v1/pecas/:id/chat. */
export type PecaChatResponse = PecaChatMessage;

// ── Fatia: teses / tom / instruções (tela de partida) ───────────────────────

/** Confiança de uma tese sugerida pela IA. */
export type ThesisConfidence = "alta" | "media" | "baixa";

/** Tom da peça enviado ao BE no generate. */
export type PecaTone =
  "tecnico-formal" | "direto-assertivo" | "conciliador-institucional";

/** Uma tese sugerida pela IA — POST /v1/pecas/:id/theses. */
export interface Thesis {
  label: string;
  confidence: ThesisConfidence;
  reference: string;
  foundation: string;
}

/** Resposta do POST /v1/pecas/:id/theses. */
export interface ThesesResponse {
  theses: Thesis[];
}

/** Body opcional do POST /v1/pecas/:id/generate. */
export interface GeneratePecaBody {
  tone?: PecaTone;
  instructions?: string;
  theses?: string[];
}
