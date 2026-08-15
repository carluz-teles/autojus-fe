// Espelha o read model do BE: GET /v1/processos → { data: ProcessoView[], page }.
// Processo consolidado a partir da captura (DJEN) + enriquecimento (DATAJUD).

export type ProcessoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type ProcessoSecrecy = "PUBLIC" | "RESTRICTED" | "SECRET";

export interface ProcessoView {
  id: string;
  case_id: string;
  cnj_number: string;
  court: string;
  degree: ProcessoDegree;
  class: string;
  subject: string;
  judging_body: string;
  filed_at: string | null;
  secrecy: ProcessoSecrecy;
  lifecycle: string;
  completeness: number;
  last_movement_text: string;
  last_movement_at: string | null;
  /** Valor da causa como decimal em string (ex. "250000.00") ou null. */
  claim_value: string | null;
  /** Id INTERNO do responsável (assigned user) — nunca org_id/tenant_id. null = sem responsável. */
  assigned_user_id: string | null;
  /** Nome do responsável pelo processo (assigned user) ou null. */
  assigned_user_name: string | null;
  /**
   * Próximo prazo a vencer, projeção derivada do BE (quando entregue). Pode vir
   * null (sem prazo) ou undefined (BE ainda não expõe). O MVP Bridge preenche
   * cliente-side via useProcessosPrazos.
   */
  next_deadline?: NextDeadlineView | null;
}

/** Projeção do prazo mais próximo — shape minimal, suficiente para a coluna. */
export interface NextDeadlineView {
  /** Vencimento do prazo (RFC3339). */
  end_date: string;
  /** Dias restantes (negativo = vencido). */
  days_left: number;
  /** Tipo legible do prazo (ex.: "Recurso", "Contestação"). */
  kind: string;
}

/**
 * Filtros avançados da lista de processos — aplicados server-side via query
 * string. `class` filtra pela classe processual (cr.class); `judging_body` filtra
 * pelo órgão julgador; `claim_value_min/max` pelas casas de valor da causa
 * (decimais em string, ex. "250000.00").
 */
export interface ProcessoFilters {
  class?: string;
  judging_body?: string;
  claim_value_min?: string;
  claim_value_max?: string;
}

// GET /v1/processos/:id/partes — as partes do processo agrupadas por polo, para
// os cards AUTOR/RÉU do cockpit. Cada lista é sempre inicializada (nunca null);
// vazia = "sem partes identificadas ainda". document (CPF/CNPJ) pode ser null.

/** Um advogado de uma parte (OAB + UF). */
export interface PartyCounsel {
  name: string;
  oab: string;
  uf: string;
}

/** Uma parte (autor/réu/terceiro) com seus advogados. document pode ser null. */
export interface Party {
  name: string;
  document: string | null;
  counsels: PartyCounsel[];
}

/** Partes do processo agrupadas por polo. */
export interface PartesView {
  autor: Party[];
  reu: Party[];
  terceiros: Party[];
}

/**
 * Contadores agregados de processos — GET /v1/processos/summary. Objeto único
 * (sem envelope de cursor). Alimenta a KpiRow da lista.
 */
export interface ProcessosSummary {
  total: number;
  em_andamento: number;
  suspensos: number;
  arquivados: number;
  baixados: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
