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

/** Anexo linkado à peça (frente de anexos — não é desta frente, só exibimos). */
export interface PecaAttachment {
  id: string;
  document_id: string;
  name: string;
  category: string;
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
