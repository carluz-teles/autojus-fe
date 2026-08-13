// Espelha o read model do BE: GET /v1/intimacoes → { data: IntimacaoView[], page }.
// Publicações capturadas do DJEN pelas OABs monitoradas (intimation → read model).

export type IntimacaoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type IntimacaoType = "INTIMACAO" | "CITACAO" | "COMUNICACAO";
export type IntimacaoStatus = "ACTIVE" | "CANCELLED";
/** Situação de triagem do usuário sobre a intimação (inbox). */
export type IntimacaoUserStatus = "PENDING" | "RESOLVED" | "IGNORED";

export interface IntimacaoView {
  id: string;
  cnj_number: string;
  court: string;
  degree: IntimacaoDegree;
  type: IntimacaoType;
  status: IntimacaoStatus;
  /** Situação de triagem (Pendente/Resolvida/Ignorada) — dirige o StatusBadge. */
  user_status: IntimacaoUserStatus;
  source: string;
  source_url: string;
  made_available_at: string;
  published_at: string;
  deadline_start_at: string;
  content_preview: string;
}

/**
 * Destinatário da intimação (item do jsonb `recipients`) — o advogado endereçado
 * mais o flag `matched` (a OAB é uma das monitoradas pelo escritório). Espelha o
 * djenRecipient do BE.
 */
export interface IntimacaoRecipient {
  name: string;
  oab_number: string;
  oab_uf: string;
  matched: boolean;
}

/**
 * Detalhe (deep-link) — GET /v1/intimacoes/:id. Embute a IntimacaoView da lista e
 * acrescenta os extras da tela de detalhe: o teor COMPLETO (não a prévia truncada),
 * o órgão julgador e a lista de destinatários. Espelha o IntimacaoDetailView do BE.
 */
export interface IntimacaoDetalheView extends IntimacaoView {
  /** Teor COMPLETO da publicação (não truncado como content_preview). */
  content: string;
  /** Órgão julgador (court_record.judging_body). */
  judging_body: string;
  /** Destinatários (jsonb) — sempre um array (nunca null); pode vir vazio. */
  recipients: IntimacaoRecipient[];
}

/**
 * Contadores agregados de intimações — GET /v1/intimacoes/summary. Objeto único
 * (sem envelope de cursor). `em_analise`/`criticas` podem vir 0 (Fase 3).
 */
export interface IntimacoesSummary {
  total: number;
  pendentes: number;
  em_analise: number;
  resolvidas: number;
  ignoradas: number;
  criticas: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
