// Domínio de Peças — tipos que espelham o contrato REAL do BE (branch
// feat/peca-draft-fatia1 do repo backend). Os tipos abaixo são a fonte de
// verdade para service → hook → component deste domínio.
//
// POST /v1/pecas   → { data: PecaCriadaView }   (201 novo / 200 já existia)
// GET  /v1/pecas/:id → { data: PecaDetalheView } (404 → ApiError ENTITY_NOT_FOUND)
// PATCH /v1/pecas/:id → { data: PecaSalvaView }

/** Origem da solicitação de criação de peça. */
export type PecaSource = "intimation";

/** Status do ciclo de produção da peça (espelha o CHECK da tabela draft no BE). */
export type PecaStatus = "DRAFT" | "REVIEWED" | "SIGNED";

/** Estado da saga de produção (espelha o CHECK da tabela draft no BE). */
export type PecaSagaState =
  "CREATED" | "EXTRACTING" | "REVIEWED" | "SIGNED" | "FILED" | "LABELED";

// ── Tipos de resposta do BE ─────────────────────────────────────────────────

/** Retornado pelo POST /v1/pecas (201 ou 200 — idempotente). */
export interface PecaCriadaView {
  id: string;
  piece_type: string;
  title: string;
  status: PecaStatus;
  saga_state: PecaSagaState;
  created_at: string;
  updated_at: string;
}

/** Contexto de intimação embutido no detalhe da peça. */
export interface PecaIntimacaoCtx {
  id: string;
  type: string;
  /** Teor completo da intimação (pode ser null). */
  content: string | null;
  made_available_at: string;
  deadline_start_at: string | null;
}

/** Contexto do processo embutido no detalhe da peça. */
export interface PecaProcessoCtx {
  case_id: string;
  court_record_id: string;
  cnj_number: string;
  court: string;
  degree: string;
  class: string;
  subject: string;
  judging_body: string;
}

/** Contexto de prazo embutido — null quando a intimação não tem prazo. */
export interface PecaPrazoCtx {
  id: string;
  end_date: string;
  /** Dias corridos até end_date. O BE clampa em 0 — nunca negativo. */
  days_left: number;
  status: string;
}

/** Detalhe completo — GET /v1/pecas/:id. */
export interface PecaDetalheView {
  id: string;
  piece_type: string;
  title: string;
  /** Conteúdo da minuta — null quando ainda não redigida. */
  content: string | null;
  status: PecaStatus;
  saga_state: PecaSagaState;
  created_at: string;
  updated_at: string;
  // O BE serializa intimation/process com `omitempty` — ausentes quando a peça
  // não tem intimação de origem (source=blank/processo). Opcionais para casar
  // com o contrato real; a UI da F1 só cria source=intimation, mas o GET aceita
  // qualquer draft — guardar o acesso com optional-chaining.
  intimation?: PecaIntimacaoCtx;
  process?: PecaProcessoCtx;
  deadline: PecaPrazoCtx | null;
  /** Fatia 2: lista de anexos — [] quando vazio, nunca null (serializado pelo BE). */
  attachments: PecaAnexo[];
}

/** Resposta do PATCH /v1/pecas/:id. */
export interface PecaSalvaView {
  id: string;
  title: string;
  updated_at: string;
}

// ── Anexos da Peça ───────────────────────────────────────────────────────────

/** Categorias válidas de anexo (6 opções + default "Outro"). */
export type AnexoCategoria =
  | "Procuração"
  | "Comprovante de endereço"
  | "Contrato"
  | "Provas documentais"
  | "Declaração de hipossuficiência"
  | "Outro";

export const ANEXO_CATEGORIAS: AnexoCategoria[] = [
  "Procuração",
  "Comprovante de endereço",
  "Contrato",
  "Provas documentais",
  "Declaração de hipossuficiência",
  "Outro",
];

/**
 * Item de anexo — espelha o attachment_item do BE.
 * GET /v1/pecas/:id retorna `data.attachments: PecaAnexo[]` ([] quando vazio, nunca null).
 */
export interface PecaAnexo {
  id: string;
  document_id: string;
  name: string;
  category: AnexoCategoria | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: string;
  position: number;
  created_at: string;
}

/** Body do POST /v1/pecas/:id/anexos. */
export interface AttachDocumentoInput {
  document_id: string;
  category?: AnexoCategoria;
}

/** Body do PATCH /v1/pecas/:id/anexos/:attachmentId. */
export interface UpdateAnexoCategoriaInput {
  category: AnexoCategoria;
}

// ── Inputs ──────────────────────────────────────────────────────────────────

/** Body do POST /v1/pecas. */
export interface CreatePecaInput {
  source: PecaSource;
  intimation_id: string;
}

/** Body do PATCH /v1/pecas/:id. */
export interface PatchPecaInput {
  content: string;
  title?: string;
}

// ── Tipos legados preservados para compatibilidade com pecas-list-page ──────
// (a casca da lista ainda não consome o BE real — mantemos PecaView/PecasSummary
//  como stubs para não quebrar a casca existente)

export type PecaOrigem = "IA" | "MODELO" | "BRANCO" | "INTIMACAO";

export interface PecaView {
  id: string;
  code: string;
  title: string;
  type: string;
  cnj_number: string;
  origem: PecaOrigem;
  responsavel: string | null;
  status: PecaStatus;
  version: number;
  updated_at: string;
}

export interface PecasSummary {
  total: number;
  em_producao: number;
  em_revisao: number;
  protocoladas: number;
  arquivadas: number;
}
