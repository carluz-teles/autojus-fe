// Espelha o read model do BE: GET /v1/processos → { data: ProcessoView[], page }.
// Processo consolidado a partir da captura (DJEN) + enriquecimento (DATAJUD).

export type ProcessoDegree = "UNKNOWN" | "G1" | "G2" | "JE" | "SUPERIOR";
export type ProcessoSecrecy = "PUBLIC" | "RESTRICTED" | "SECRET";

/** Fase processual — o stepper do cockpit. Conjunto fechado, alinhado ao BE (court_record.phase). */
export type ProcessoPhase =
  "CONHECIMENTO" | "INSTRUCAO" | "SENTENCA" | "RECURSO" | "EXECUCAO";

export interface ProcessoView {
  id: string;
  case_id: string;
  cnj_number: string;
  court: string;
  degree: ProcessoDegree;
  class: string;
  subject: string;
  /**
   * Título de exibição — calculado no BE, sempre presente. Prioridade: label
   * manual > réu+CNJ > classe·assunto. Espelha IntimacaoView.title (mesma
   * fonte única, Regra nº1).
   */
  title: string;
  /**
   * Valor bruto do apelido manual (label do processo) — string quando definido,
   * null quando não há override (título cai no fallback automático). Só
   * processos têm este campo (intimações não). Usado para popular o form de
   * edição do título.
   */
  label: string | null;
  judging_body: string;
  filed_at: string | null;
  secrecy: ProcessoSecrecy;
  lifecycle: string;
  completeness: number;
  /** Fase EFETIVA do processo (override manual vence a derivada); null até derivar/definir. */
  phase: ProcessoPhase | null;
  /** Valor da causa, em reais — preenchido à mão (sem fonte automática); null quando vazio. */
  claim_value: number | null;
  last_movement_text: string;
  last_movement_at: string | null;
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
 * Filtros da lista de processos — aplicados server-side via query string e
 * sincronizados com a URL (?court=, ?degree=, ?assignee=). Os valores vêm das
 * opções emitidas pelo BE no envelope (`filters`), nunca digitados livremente;
 * `assignee` é o uuid interno do responsável (o label legível vem do envelope).
 */
export interface ProcessoFilters {
  /** Tribunal do processo (ex.: "TJSP"). */
  court?: string;
  /** Grau do processo (ex.: "G1", "G2", "JE", "SUPERIOR"). */
  degree?: string;
  /** Id interno do responsável (assigned user) — uuid, nunca org_id/tenant_id. */
  assignee?: string;
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

// GET /v1/processos/:id/resume — o resumo do processo por IA (write-once
// sync-on-first-GET: o BE gera na primeira abertura, persiste na court_record e
// serve do cache nas seguintes). Slices SEMPRE vêm inicializados pelo BE (nunca
// null); em modo degradado (sem LLM configurado) summary="" e risks/ações são [].
export interface ProcessoResumoView {
  summary: string;
  current_status: string;
  key_dates_and_deadlines: ResumoKeyDate[];
  recent_movements: ResumoMovement[];
  risks: ResumoRisk[];
  recommended_actions: ResumoAction[];
  /** Momento em que o resumo foi gerado (RFC3339) — informa a idade do cache. */
  generated_at: string;
}

/** Prazo aberto com sinalização de urgência do resumo por IA. */
export interface ResumoKeyDate {
  kind: string;
  /** Vencimento (YYYY-MM-DD). */
  end_date: string;
  /** Dias restantes (negativo = vencido). */
  days_remaining: number;
  /** OVERDUE | DUE_SOON | OK — determinístico no BE, espelha o prompt. */
  urgency: "OVERDUE" | "DUE_SOON" | "OK";
  /** deadline_id ou intimação de referência. */
  source: string;
}

/** Andamento significativo citado no resumo. */
export interface ResumoMovement {
  occurred_at: string;
  text: string;
  source: string;
}

/** Sinal vermelho detectado no processo. */
export interface ResumoRisk {
  description: string;
  source: string;
}

/** Próximo passo sugerido. */
export interface ResumoAction {
  action: string;
  source: string;
}
