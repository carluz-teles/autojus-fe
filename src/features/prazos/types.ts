// Espelha os read models de prazo (deadline) do BE — vencimentos calculados a
// partir das intimações no calendário forense (dias úteis, recesso, feriados).
//   GET /v1/processos/:id/prazos → PageEnvelope<PrazoView>        (aba do processo)
//   GET /v1/prazos               → PageEnvelope<PrazoAgendaView>  (agenda global)
//   GET /v1/prazos/:id           → PrazoDetalheView               (o "por quê")

export type PrazoStatus =
  "PENDING" | "OPEN" | "MET" | "MISSED" | "CANCELLED" | "NO_DEADLINE";

/** Evento de ancoragem do prazo — de onde começa a contagem. */
export type PrazoAnchorEvent =
  "MADE_AVAILABLE" | "PUBLISHED" | "DEADLINE_START";

/** Regime de contagem: BUSINESS = dias úteis; CALENDAR = dias corridos. */
export type PrazoCounting = "BUSINESS" | "CALENDAR";

// Prazo base (o que a aba do processo entrega).
export interface PrazoView {
  id: string;
  kind: string;
  /** Fim do prazo (RFC3339). */
  end_date: string;
  /** Dias restantes (negativo = vencido). Base da contagem regressiva. */
  days_left: number;
  counting: PrazoCounting;
  doubled: boolean;
  doubled_reason: string;
  status: PrazoStatus;
  /** Feriados/suspensões aplicados no cálculo. */
  holidays_applied: string[];
  intimation_id: string;
  /** false = derivado da intimação mas ainda não confirmado por um humano. */
  confirmed: boolean;
  // ── campos extras entregues pelo BE (migração 0049) ──
  /** Evento de ancoragem (omitempty quando PENDING e não derivado ainda). */
  anchor_event?: PrazoAnchorEvent;
  /** Data de início da contagem (RFC3339 DATE). */
  start_date?: string;
  /** Número de dias da contagem base (antes de dobro/feriados). */
  days?: number;
  /** Citação legal que fundamenta a regra (omitempty). Ex.: "art. 919, CPC". */
  legal_citation?: string;
  /** Dias manuais extras por feriado local ou suspensão forense. */
  manual_extra_days?: number;
  /** Nome do responsável que confirmou/declarou (omitempty). */
  confirmed_by_name?: string;
  /** ISO8601 de quando foi confirmado/declarado (omitempty). */
  confirmed_at?: string;
}

// Agenda global — o prazo base acrescido do contexto do processo.
export interface PrazoAgendaView extends PrazoView {
  court_record_id: string;
  cnj_number: string;
  court: string;
}

// Detalhe (o "por quê" completo): como o prazo foi computado.
export interface PrazoDetalheView extends PrazoAgendaView {
  start_date: string;
  days: number;
  source: string;
  rules_version: string;
  // ── V1: motor de prazos / memória de cálculo (migração 0084) ──
  /** De onde veio a data: declarado no ato, calculado por regra, inferido por IA
   *  ou em divergência entre declarado × calculado. Presente desde a 0084. */
  origem?: PrazoOrigem;
  /** Selo de confiança — dimensão separada do relógio (days_left). */
  selo?: PrazoSelo;
  confirmacao_exigida: boolean;
  /** RFC3339. Hoje sempre igual a end_date (buffer=0, placeholder até o produto
   *  definir a folga interna) — omitir o sub-rótulo "interno" quando igual. */
  prazo_interno: string;
  /** null/ausente = prazo pré-V1 (antes da 0084); degradar graciosamente. */
  calc_memory?: PrazoCalcMemory | null;
  applied_holiday?: PrazoAppliedHoliday[];
  cross_validation?: PrazoCrossValidation | null;
}

export type PrazoOrigem = "declarado" | "calculado" | "ia" | "divergente";
export type PrazoSelo = "confiavel" | "a_apurar";

export interface PrazoCalcMemory {
  prazo_base: string;
  prazo_base_fonte: string;
  termo_inicial_regra: string;
  dias_uteis: boolean;
  dobra_motivo?: string;
  tabela_legal_ref?: string;
  ia_tipo_inferido?: string;
  /** 0-1. */
  ia_confianca?: number;
  calendar_provider_version?: string;
}

export interface PrazoAppliedHoliday {
  data: string;
  nome?: string;
  ambito?: string;
  comarca?: string;
}

export type PrazoCrossValidationResultado = "convergente" | "divergente";

/** "" até ser apurado; preenchido depois de POST .../apurar-divergencia. */
export type PrazoCrossValidationDecisao =
  "" | "aceita_declarado" | "aceita_calculado" | "ajuste_manual";

export interface PrazoCrossValidation {
  data_declarada: string;
  data_calculada: string;
  dif_dias: number;
  resultado: PrazoCrossValidationResultado;
  causa_provavel?: string;
  decisao?: PrazoCrossValidationDecisao;
  decidido_por?: string;
}

// ── Apuração de divergência (POST /v1/prazos/:id/apurar-divergencia) ──

export type PrazoApurarDivergenciaDecisao =
  "aceita_declarado" | "aceita_calculado" | "ajuste_manual";

/** Campos além de `decisao` só importam quando decisao === "ajuste_manual". */
export interface PrazoApurarDivergenciaInput {
  decisao: PrazoApurarDivergenciaDecisao;
  days?: number;
  counting?: PrazoCounting;
  doubled?: boolean;
  anchor_event?: PrazoAnchorEvent;
  manual_extra_days?: number;
}

export interface PrazoApurarDivergenciaResult {
  deadline_id: string;
  end_date: string;
  selo: PrazoSelo;
  decisao: PrazoApurarDivergenciaDecisao;
}

// ── Apuração de tipo por IA (POST /v1/prazos/:id/apurar-tipo) ──

export type PrazoApurarTipoAcao = "confirmar" | "reclassificar";

/** `tipo` obrigatório só quando acao === "reclassificar". */
export interface PrazoApurarTipoInput {
  acao: PrazoApurarTipoAcao;
  tipo?: string;
}

export interface PrazoApurarTipoResult {
  deadline_id: string;
  tipo: string;
  selo: PrazoSelo;
}

// ── F2: confirmar prazo ("Aprovar tudo") ──
// POST /v1/prazos/confirm — o advogado ajusta o prazo derivado e monta as tarefas;
// numa tacada o deadline vira OPEN + N tasks. Idempotente por intimation_id.

/** Tarefa a criar junto do prazo. Só `title` é obrigatório. */
export interface PrazoConfirmTask {
  title: string;
  kind?: string;
  /** Vencimento no formato "YYYY-MM-DD" (date input); omitido = sem prazo. */
  due_date?: string;
  description?: string;
  /** Id INTERNO do responsável (Me.user_id) — nunca org_id/tenant_id. */
  assignee_user_id?: string;
}

/** Prazo ajustado pelo advogado antes de abrir. */
export interface PrazoConfirmDeadline {
  kind: string;
  days: number;
  counting: PrazoCounting;
  doubled: boolean;
  doubled_reason?: string;
  anchor_event?: PrazoAnchorEvent;
  manual_extra_days?: number;
}

// ── Preview ao vivo (POST /v1/prazos/preview) ──

/** Corpo do POST /v1/prazos/preview — entrada para recalculo client-side. */
export interface PrazoPreviewInput {
  intimation_id: string;
  anchor_event: PrazoAnchorEvent;
  kind: string;
  days: number;
  counting: PrazoCounting;
  doubled: boolean;
  manual_extra_days?: number;
}

/** Resposta 200 do preview: vencimento recalculado sem persistir. */
export interface PrazoPreviewResult {
  start_date: string;
  end_date: string;
  weekday: string;
  days_left: number;
  holidays_applied: string[];
}

// ── Declarar mera ciência (POST /v1/prazos/:id/no-deadline) ──
// Sem corpo de entrada — o BE usa o JWT para resolver o autor.

// ── Reabrir prazo (POST /v1/prazos/:id/reopen) ──
// Sem corpo de entrada — volta a PENDING.

/** Corpo do POST /v1/prazos/confirm (sem tenant_id/org_id — o BE resolve pelo JWT). */
export interface PrazoConfirmInput {
  intimation_id: string;
  deadline: PrazoConfirmDeadline;
  tasks: PrazoConfirmTask[];
}

/** Resposta 200: o prazo agora OPEN (confirmado) + as tarefas criadas. */
export interface PrazoConfirmResult {
  deadline: PrazoDetalheView & { confirmed_by?: string };
  tasks: Array<{ id: string; title: string; due_date: string | null }>;
}

// ── Tarefas sugeridas por LLM (on-demand) ──
// GET /v1/prazos/:id/suggested-tasks → a "Análise" que pré-preenche o F2 "Aprovar tudo".
// O LLM (via OpenRouter) lê a intimação + o prazo e devolve, numa tacada: o resumo do
// que aconteceu, a recomendação do que fazer e as tarefas acionáveis; o advogado
// edita/aprova. `kind` é uma categoria curta livre (ANALISE|PECA|PROTOCOLO|…).
export interface SuggestedTask {
  title: string;
  kind: string;
  /** "Por quê" da tarefa. Sempre presente no BE (sem omitempty), pode vir "". */
  description: string;
}

/**
 * Resposta 200: a Análise única (sem envelope de cursor). `summary` ("O que aconteceu")
 * e `recommendation` ("O que fazer") são sempre presentes (BE sem omitempty), mas vêm ""
 * quando o LLM não está configurado/indisponível — nesse caso `suggested_tasks` é [].
 */
export interface SuggestedTasksResult {
  summary: string;
  recommendation: string;
  suggested_tasks: SuggestedTask[];
}

/**
 * Contadores agregados da agenda de prazos — GET /v1/prazos/summary. Objeto único
 * (sem envelope de cursor). Alimenta a KpiRow do topo da tela.
 */
export interface PrazosSummary {
  total: number;
  criticos: number;
  vencendo: number;
  abertos: number;
  futuros: number;
  vencidos: number;
  cumpridos: number;
}

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
