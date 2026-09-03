// Tipos "wire" — o formato exato que o BE devolve nas rotas /v1/pecas/:id.
// Vive separado dos tipos de domínio (types.ts) porque:
//   1. snake_case vs camelCase — não queremos vazar o formato do BE nos
//      componentes;
//   2. campos opcionais/nullable — o BE devolve null em vários pontos;
//   3. shape parcialmente diferente — `structured_content` mora dentro do
//      detail no BE, mas o domínio v2 achata em `Draft.preamble/sections`.
//
// O mapper (api-mapper.ts) traduz cada shape.

// ── Envelope ─────────────────────────────────────────────────────────────────

export interface DataEnvelope<T> {
  data: T;
}

// ── Draft detail (GET /v1/pecas/:id) ─────────────────────────────────────────

export interface PecaDetailAPI {
  id: string;
  piece_type: string;
  title: string;
  content: string;
  status: string;
  saga_state: string;
  created_at: string;
  updated_at: string;
  structured_content: StructuredContentAPI | null;
  // Fase B do editor rico: HTML do Tiptap. null pra peças legacy ou geradas
  // pela IA antes do 1º save humano. Quando não-null, source-of-truth
  // pro editor (RichEditor) e pro renderer PDF (chromedp, Fase C).
  content_html: string | null;
  /** content_html foi editado à mão desde a última geração (0096). Mudar teses
   *  regenera a peça e descartaria os ajustes — o FE avisa antes. */
  content_edited?: boolean;
  authorship: "assistant" | "human_taken";

  intimation: IntimationAPI | null;
  process: ProcessAPI | null;
  deadline: DeadlineAPI | null;
  attachments: AttachmentAPI[];
  /** Autos do processo (documentos fetchados do court_record). [] quando sem processo. */
  process_documents: ProcessDocumentAPI[];
  providences: ProvidenceAPI[];
  parties: PartyAPI[];
  review: ReviewAPI | null; // legacy — v2 UI não lê

  // Workflow steps (Fatia 2a — 0060). ISO 8601 UTC ou null.
  sent_to_signing_at: string | null;
  signed_at: string | null;
  filed_at: string | null;
  filing_number: string;
  signed_pdf_url: string | null; // Fatia 2b — presigned GET (15 min); null antes de assinar
}

// role é o enum bruto do BE — o mapper converte pra autor/reu/procurador
// (que é a taxonomia da UI). counsels é sempre array (nunca null).
export interface PartyAPI {
  role: "PLAINTIFF" | "DEFENDANT" | "THIRD_PARTY";
  name: string;
  counsels: CounselAPI[];
  // Marca a parte que é o cliente do escritório (destaca no rail PARTES).
  // Opcional — se o BE não expuser, o mapper cai no fallback (ver api-mapper).
  is_client?: boolean;
}

export interface CounselAPI {
  name: string;
  oab: string;
  uf: string;
}

export interface StructuredContentAPI {
  preamble: { paragraphs: string[] };
  sections: {
    id: string;
    roman: string;
    title: string;
    short_title: string;
    paragraphs: string[];
  }[];
}

export interface IntimationAPI {
  id: string;
  type: string;
  content: string;
  made_available_at: string;
  deadline_start_at: string;
}

export interface ProcessAPI {
  case_id: string;
  court_record_id: string;
  cnj_number: string;
  court: string;
  degree: string;
  class: string;
  subject: string;
  judging_body: string;
  // Valor da causa — string decimal (ex.: "180000.00"). O BE passou a expor no
  // read model; o mapper formata em BRL. Opcional/vazio pra peças legadas.
  claim_value?: string | null;
}

export interface DeadlineAPI {
  id: string;
  end_date: string;
  days_left: number;
  status: string;
}

export interface AttachmentAPI {
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

/** Documento dos autos do processo (fetchado do court_record). Read-only. */
export interface ProcessDocumentAPI {
  id: string;
  label: string;
  document_type: string;
  /** Rótulo pt-BR enriquecido do tipo (BE mapeia o código via eproc.DocumentTypeLabel). */
  type_label: string;
  pages: number;
  status: string;
  /** Data do evento no eproc — RFC3339 ou "" quando ausente (upload humano). */
  event_date: string;
}

export interface ProvidenceAPI {
  id: string;
  title: string;
  kind: string;
  source: string; // "AI" | "RULE" | "MANUAL"
  status: string; // "OPEN" | "DONE"
}

export interface ReviewAPI {
  status: string;
  generated_at: string;
  grounded: boolean;
  suggestions: unknown[]; // shape legado — não usamos na v2
}

// ── Teses (GET/POST /v1/pecas/:id/theses; PATCH …/:thesisId) ─────────────────
// Wire shape do contrato Teses (snake_case). Provenance obrigatória:
// source_document_id referencia EXATAMENTE UM attachment da "Fundada em".

export interface ThesisAPI {
  id: string;
  draft_id?: string;
  label: string;
  foundation: string;
  legal_ref: string;
  /** FK ao documento do caso (autos) — vazio quando a fonte é o teor. Âncora PRIMÁRIA. */
  source_document_id: string;
  /** FK à intimação quando a fonte é o TEOR — vazio quando é um doc. */
  source_intimation_id?: string;
  source_label: string;
  source_excerpt: string;
  /** Page da âncora primária. */
  source_page?: number;
  /** TODAS as âncoras da tese (uma tese pode ser sustentada por N autos). A
   *  primária ainda vem singular acima (compat). Labels podem repetir — são
   *  documentos distintos com mesmo tipo/página. */
  anchors?: ThesisAnchorAPI[];
  /** TRECHOS da peça gerada que esta tese produziu (thesis↔segment). Vazio antes
   *  da geração ou quando nenhuma seção casou com o label. O FE mostra ao propor
   *  a remoção — "em qual mudança isso vai implicar". */
  segments?: ThesisSegmentAPI[];
  grounded: boolean;
  state: "off" | "pending_add" | "included" | "pending_remove";
  position: number;
}

export interface ThesisAnchorAPI {
  document_id: string;
  label: string;
  excerpt: string;
  page: number;
  grounded: boolean;
}

export interface ThesisSegmentAPI {
  /** Título da seção (ex.: "I — DAS PRELIMINARES"). O FE casa por texto pra ancorar. */
  heading: string;
  /** Corpo da seção (parágrafos) — o trecho real a exibir. */
  conteudo: string;
}

export interface ThesesListAPI {
  theses: ThesisAPI[];
}

// ── Chat (GET/POST /v1/pecas/:id/chat) ──────────────────────────────────────

export interface ChatThreadAPI {
  messages: ChatMessageAPI[];
  grounded_capable: boolean;
}

export interface ChatMessageAPI {
  id: string;
  draft_id: string;
  role: "user" | "assistant";
  content: string;
  citations: unknown[]; // v2 ignora citations por ora
  grounded: boolean;
  model_version?: string;
  created_at: string;
}

// ── Iterate (POST /v1/pecas/:id/iterate) ────────────────────────────────────

export interface IterateResultAPI {
  changes: SectionChangeAPI[];
}

export interface SectionChangeAPI {
  section_id: string;
  section_roman: string;
  section_title: string;
  category: string;
  explanation: string;
  old_paragraphs: string[];
  new_paragraphs: string[];
}

// ── Assume authorship (POST /v1/pecas/:id/assume-authorship) ────────────────

export interface AssumeAuthorshipResultAPI {
  authorship: "human_taken";
  updated_at: string;
}
