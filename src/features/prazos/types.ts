// Espelha os read models de prazo (deadline) do BE — vencimentos calculados a
// partir das intimações no calendário forense (dias úteis, recesso, feriados).
//   GET /v1/processos/:id/prazos → PageEnvelope<PrazoView>        (aba do processo)
//   GET /v1/prazos               → PageEnvelope<PrazoAgendaView>  (agenda global)
//   GET /v1/prazos/:id           → PrazoDetalheView               (o "por quê")

export type PrazoStatus = "PENDING" | "OPEN" | "MET" | "MISSED" | "CANCELLED";

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
}

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
