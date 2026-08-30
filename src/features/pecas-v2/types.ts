// Tipos do domínio da tela de Construção (etapa 2).
//
// Nesta rodada tudo é mockado. Na rodada seguinte, cada função de service vai
// virar chamada real ao BE (endpoints já existentes: /generate, /chat, /theses;
// e novos: /iterate, /iterate-section, /quick-adjust, /refazer-section).
// Os tipos a seguir são a fronteira estável — só o corpo dos services muda.

export type SagaState =
  "CREATED" | "EXTRACTING" | "DRAFTED" | "REVIEWED" | "FAILED";

export type Status = "DRAFT" | "SIGNED" | "FILED" | "DISCARDED";

/** Uma seção do rascunho, derivada do parser (heading romano). */
export interface DraftSection {
  /** id estável derivado do romano — usado como chave e no scope de iteração. */
  id: string;
  /** "I", "II", "III"… — o próprio marcador. */
  roman: string;
  /** Título curto pra chip ("Fatos", "Direito", "Pedidos"). */
  shortTitle: string;
  /** Título completo do heading ("Dos fatos", "Do direito", "Dos pedidos"). */
  title: string;
  /** Parágrafos da seção, em ordem. */
  paragraphs: string[];
}

/** Bloco de preâmbulo (o endereçamento e a qualificação) antes da 1ª seção. */
export interface DraftPreamble {
  paragraphs: string[];
}

/** Wrapper do conteúdo estruturado — preâmbulo + seções. Espelha o shape que
 *  o BE persiste em `draft.structured_content` (Peça v2, migration 0056). */
export interface StructuredContent {
  preamble: DraftPreamble;
  sections: DraftSection[];
}

/** Contexto da intimação de origem — o que a coluna esquerda mostra em cima. */
export interface DraftIntimation {
  id: string;
  title: string;
  publishedAt: string;
  teor: string;
}

/** Bloco Processo do sidebar de contexto. */
export interface DraftProcess {
  /** UUID do court_record — usado pelo upload de anexos (POST /documents
   *  presigned exige `court_record_id`). Não é exibido na UI. */
  courtRecordId: string;
  cnj: string;
  classe: string;
  assunto: string;
  orgao: string;
  tribunalGrau: string;
  valor: string;
  distribuicao: string;
}

export interface DraftParty {
  role: "autor" | "reu" | "procurador";
  name: string;
  detail?: string;
}

/** Parte agrupada para o rail PARTES da tela de Construção: uma linha por parte
 *  (autor/réu/terceiro) com seus procuradores achatados numa linha e a flag de
 *  cliente do escritório. Distinto de `DraftParty` (que explode counsels). */
export interface DraftPartyGroup {
  /** Papel humanizado ("Autor", "Réu", "Terceiro"). */
  roleLabel: string;
  name: string;
  /** Procuradores da parte, um rótulo por counsel (ex.: "Dra. X · OAB/SP 123"). */
  counselLabel: string;
  /** Parte é o cliente do escritório — destaca o card + badge CLIENTE. */
  isClient: boolean;
}

export interface DraftProvidence {
  code: string;
  title: string;
  origin: "sugerida" | "manual";
}

export interface DraftAttachment {
  id: string;
  name: string;
  sizeLabel: string;
  /** Categoria escolhida pelo advogado ao anexar (Procuração, Comprovante etc).
   *  Casa com o CHECK do BE (migração 0043) e o enum AttachmentCategory. */
  category: string;
}

/** Prazo derivado da intimação. */
export interface DraftDeadline {
  /** DD/MM/AAAA. */
  endDate: string;
  /** Nº de dias corridos até vencer (0 = vence hoje, negativo = em atraso). */
  daysLeft: number;
}

export type Authorship = "assistant" | "human_taken";

/** Peça completa que a tela consome. */
export interface Draft {
  id: string;
  pieceType: string;
  /** Nome curto exibido no header do sidebar ("Defesa", "Petição"). */
  title: string;
  status: Status;
  sagaState: SagaState;
  authorship: Authorship;
  updatedAt: string;
  preamble: DraftPreamble;
  sections: DraftSection[];
  intimation: DraftIntimation;
  process: DraftProcess;
  parties: DraftParty[];
  /** Partes agrupadas para o rail PARTES (uma linha por parte + procuradores). */
  partyGroups: DraftPartyGroup[];
  providences: DraftProvidence[];
  attachments: DraftAttachment[];
  deadline: DraftDeadline;
  /** Total de teses usadas na geração (aparece no banner: "…e de 3 teses"). */
  thesisCount: number;

  // ── Workflow steps (Fatia 2a — 0060) ──
  /** ISO 8601 quando o usuário clicou "Enviar para assinatura"; null antes. */
  sentToSigningAt: string | null;
  /** ISO 8601 quando a peça foi assinada; null antes. */
  signedAt: string | null;
  /** ISO 8601 quando foi protocolada; null antes. */
  filedAt: string | null;
  /** Número/protocolo do tribunal (input manual v0). */
  filingNumber: string;
  /** Presigned GET URL do PDF assinado (Fatia 2b). null antes de assinar. */
  signedPDFURL: string | null;

  /** HTML rico do editor Tiptap (Fase B do editor rico). null quando a peça
   *  ainda não passou pelo editor humano (IA gerou só structured_content).
   *  Quando não-null: source-of-truth. FE dá preferência pra este campo
   *  ao popular o editor; PDF final (Fase C, chromedp) usa ele direto. */
  contentHtml: string | null;
}

/** Step atual do peticionamento — derivado dos timestamps. */
export type WorkflowStep =
  "construcao" | "assinatura" | "protocolo" | "concluida";

/** Deriva o step atual a partir dos 3 timestamps datados. Regra:
 *  sentToSigningAt=null → Construção;
 *  sentToSigningAt!=null && signedAt=null → Assinatura;
 *  signedAt!=null && filedAt=null → Protocolo;
 *  filedAt!=null → Concluída.
 */
export function deriveStep(
  d: Pick<Draft, "sentToSigningAt" | "signedAt" | "filedAt">,
): WorkflowStep {
  if (d.filedAt) return "concluida";
  if (d.signedAt) return "protocolo";
  if (d.sentToSigningAt) return "assinatura";
  return "construcao";
}

// ── Iteração / ajustes rápidos ───────────────────────────────────────────────

/** Escopo de uma iteração: "peça toda" ou o id de uma seção específica. */
export type IterateScope = { kind: "whole" } | { kind: "section"; id: string };

export type QuickAdjustKind =
  "emphatic" | "concise" | "reinforce_thesis" | "add_grounds";

/** Resultado de qualquer iteração (livre ou ajuste rápido, peça toda ou seção).
 *  Cada mudança já vem com categoria/explicação/old+new paragraphs prontas
 *  pra virar um card no painel Ajuste proposto (Peça v2 — POST /iterate no BE). */
export interface IterationResult {
  changes: PendingChange[];
}

/** Uma mudança pendente numa seção — vira 1 card no painel Ajuste proposto.
 *  Cada card mostra categoria (badge âmbar), título da seção, explicação curta
 *  do porquê da mudança e o diff em blocos (removido/adicionado). */
export interface PendingChange {
  sectionId: string;
  sectionRoman: string;
  sectionTitle: string;
  /** Rótulo curto na badge — "CLAREZA", "CONCISÃO", "ÊNFASE", "FUNDAMENTAÇÃO",
   *  "AJUSTE" (fallback para iteração livre). */
  category: string;
  /** Uma frase explicando o porquê da mudança. Vazio = omite. */
  explanation: string;
  oldParagraphs: string[];
  newParagraphs: string[];
}

/** Estado do painel "Ajuste proposto" — 1..N cards pendentes derivados de uma
 *  iteração (escopo "whole" gera N cards, escopo "section" gera 1). O painel
 *  fecha automaticamente quando pending fica vazio. */
export interface PreviewState {
  scope: IterateScope;
  scopeLabel: string;
  pending: PendingChange[];
  onAcceptOne: (sectionId: string) => void;
  onDismissOne: (sectionId: string) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** ISO-8601. */
  createdAt: string;
}

export type QuickActionKind =
  "summarize_case" | "suggest_theses" | "check_deadline" | "find_precedents";

// ── Protocolo automático (Fatia 1 — e-SAJ) ──────────────────────────────────

/** Status de uma tentativa de protocolo automático no e-SAJ. */
export type FilingStatus =
  "ENFILEIRADO" | "PROTOCOLANDO" | "PROTOCOLADO" | "FALHOU";

/** Resposta do POST /v1/pecas/:id/filing/approve (201 na 1ª vez, 200 idempotente). */
export interface FilingApproveResult {
  filingAttemptId: string;
  status: FilingStatus;
  isIdempotent: boolean;
}

/** Tentativa de protocolo — GET /v1/pecas/:id/filing (null se nunca solicitado). */
export interface FilingAttempt {
  id: string;
  status: FilingStatus;
  requestedAt: string;
  finishedAt: string | null;
  failureReason: string | null;
  filingNumber: string | null;
}

// ── Teses da peça (contrato Teses — provenance obrigatória) ──────────────────

/** Estado propor→aprovar de uma tese, por rascunho. O rail só faz as transições
 *  de propor (off↔pending_add, included↔pending_remove); o editor aprova. */
export type ThesisState = "off" | "pending_add" | "included" | "pending_remove";

/** Uma tese sugerida pela IA, SEMPRE ancorada em exatamente um documento de
 *  origem (`sourceDocumentId` → item da "Fundada em"). Espelha o wire shape
 *  snake_case do contrato Teses. */
export interface Thesis {
  id: string;
  /** Título curto (ex.: "Prescrição da pretensão"). */
  label: string;
  /** Fundamentação curta (o "desc" do design). */
  foundation: string;
  /** Artigo/dispositivo (ex.: "art. 206, §5º, do Código Civil"). */
  legalRef: string;
  /** FK ao attachment de origem (Fundada em) — provenance obrigatória. */
  sourceDocumentId: string;
  /** Rótulo humano da fonte, denormalizado p/ display. */
  sourceLabel: string;
  /** Trecho literal do doc que sustenta a tese (evidência). */
  sourceExcerpt: string;
  /** A fonte sustenta a tese? true → ✓ verde; false → ? dourado. */
  grounded: boolean;
  state: ThesisState;
  /** Ordem estável. */
  position: number;
}
