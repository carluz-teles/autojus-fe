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

// Envelope paginado compartilhado — fonte única em @/lib/api/types (Regra nº1).
export type { PageEnvelope } from "@/lib/api/types";
