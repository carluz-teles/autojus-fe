// Lógica pura do Calendário (Mês / Semana / Dia). Sem React e sem JSX: recebe as
// providências (action_item) e os prazos reais já mapeados para uma lista única de
// eventos por dia e monta as grades que os componentes de vista bindam. Espelha
// lib/pipeline.ts (builder puro, testável em unidade). As datas são DINÂMICAS —
// tudo é calculado contra uma data de referência recebida (o mês/semana/dia
// corrente e navegáveis), nunca contra um valor fixo.
//
// FORA DE ESCOPO (decisão de produto): não existe domínio de audiência no BE — o
// Calendário mostra só Prazos (na data fatal, end_date) + Providências (no
// vencimento, due_date). A grade de horas do Dia fica sem eventos posicionados.

import { urg, type UrgKey } from "./derivar";

// ── Vocabulário ───────────────────────────────────────────────────────────────
// Zero "tarefa"/"IA" visível (diretiva app-wide): providência é a unidade de
// trabalho; prazo é o vencimento fatal.
export type CalEventoTipo = "prazo" | "providencia";

// Evento normalizado do calendário — a fonte única que alimenta Mês/Semana/Dia.
// `dia` é a chave "YYYY-MM-DD" (sem hora/timezone) usada pra agrupar.
export interface CalEvento {
  id: string;
  tipo: CalEventoTipo;
  /** Texto curto exibido no chip/card (título da providência ou tipo do prazo). */
  titulo: string;
  /** Sublinha opcional (CNJ curto / órgão) — pode ser vazia. */
  sub: string;
  /** "YYYY-MM-DD" do dia em que cai o evento (fatal do prazo / vencimento da providência). */
  dia: string;
  /** Dias restantes contra HOJE (negativo = vencido) — base da cor de urgência. */
  dias: number;
  href: string;
}

// ── Vistas ──────────────────────────────────────────────────────────────────
export interface CalEventoUI extends CalEvento {
  urgCor: string;
  urgK: UrgKey;
  chipFundo: string;
}

export interface CalCelula {
  vazia: boolean;
  num?: number;
  hoje?: boolean;
  temEv?: boolean;
  temExtra?: boolean;
  extra?: string;
  evs?: CalEventoUI[];
}

export interface CalSemana {
  dias: CalCelula[];
}

export interface CalDiaSemana {
  dow: string;
  data: string;
  hoje: boolean;
  vazio: boolean;
  evs: CalEventoUI[];
}

export interface CalHora {
  label: string;
  top: number;
}

export const DIAS_SEMANA = [
  "dom",
  "seg",
  "ter",
  "qua",
  "qui",
  "sex",
  "sáb",
] as const;

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const DOW_LONGO = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
] as const;

const DOW_CURTO = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"] as const;

// Grade de horas do Dia (08–19h). Mantida do design; sem eventos posicionados
// (audiências fora de escopo).
const H0 = 8;
const H1 = 19;
const PX = 56;

// ── Helpers de data (nativos, sem lib — mesma escolha de shared/prazo.ts) ─────
// Todas as datas trafegam como "YYYY-MM-DD" (data local, sem timezone) pra evitar
// o deslize de UTC.

/** "YYYY-MM-DD" de uma Date, no fuso local. */
export function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Date (meia-noite local) a partir de "YYYY-MM-DD" — parse manual pra não cair no UTC. */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Dias corridos entre dois "YYYY-MM-DD" (b - a). */
export function diffDias(aISO: string, bISO: string): number {
  return Math.round(
    (fromISODate(bISO).getTime() - fromISODate(aISO).getTime()) / 86_400_000,
  );
}

/** Domingo da semana que contém `ref`. */
export function inicioDaSemana(ref: Date): Date {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Título do mês corrente: "Setembro 2026". */
export function tituloMes(ref: Date): string {
  return `${MESES[ref.getMonth()]} ${ref.getFullYear()}`;
}

/** Título do dia corrente: "terça-feira · 08/09". */
export function tituloDia(ref: Date): string {
  const dd = String(ref.getDate()).padStart(2, "0");
  const mm = String(ref.getMonth() + 1).padStart(2, "0");
  return `${DOW_LONGO[ref.getDay()]} · ${dd}/${mm}`;
}

// ── Decoração ─────────────────────────────────────────────────────────────────
function decorar(e: CalEvento): CalEventoUI {
  const u = urg(e.dias);
  return {
    ...e,
    urgCor: u.cor,
    urgK: u.k,
    chipFundo: `color-mix(in oklch, ${u.cor} 14%, transparent)`,
  };
}

// ── Mês ───────────────────────────────────────────────────────────────────────
// Grade de 7 colunas começando no domingo. `ref` fixa o mês; `hojeISO` marca o
// dia atual (só destaca se cair no mês visível). Cada célula agrega os eventos
// que caem naquele dia (máx 3 chips + "+N mais").
export function buildMes(
  eventos: CalEvento[],
  ref: Date,
  hojeISO: string,
): CalSemana[] {
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const lead = new Date(ano, mes, 1).getDay(); // dias vazios antes do dia 1
  const totalDias = new Date(ano, mes + 1, 0).getDate();

  const cells: CalCelula[] = [];
  for (let i = 0; i < lead; i++) cells.push({ vazia: true });

  for (let d = 1; d <= totalDias; d++) {
    const iso = toISODate(new Date(ano, mes, d));
    const evs = eventos.filter((e) => e.dia === iso).map(decorar);
    cells.push({
      vazia: false,
      num: d,
      hoje: iso === hojeISO,
      temEv: evs.length > 0,
      temExtra: evs.length > 3,
      extra: (evs.length - 3).toLocaleString("pt-BR"),
      evs: evs.slice(0, 3),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ vazia: true });

  const weeks: CalSemana[] = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push({ dias: cells.slice(i, i + 7) });
  return weeks;
}

// ── Semana ────────────────────────────────────────────────────────────────────
// 7 cards (dom–sáb) da semana que contém `ref`, cada um com seus eventos.
export function buildSemana(
  eventos: CalEvento[],
  ref: Date,
  hojeISO: string,
): CalDiaSemana[] {
  const dom = inicioDaSemana(ref);
  const out: CalDiaSemana[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(dom.getFullYear(), dom.getMonth(), dom.getDate() + i);
    const iso = toISODate(d);
    const evs = eventos
      .filter((e) => e.dia === iso)
      .slice(0, 6)
      .map(decorar);
    out.push({
      dow: DOW_CURTO[d.getDay()],
      data: `${String(d.getDate()).padStart(2, "0")}/${String(
        d.getMonth() + 1,
      ).padStart(2, "0")}`,
      hoje: iso === hojeISO,
      evs,
      vazio: evs.length === 0,
    });
  }
  return out;
}

// ── Dia ───────────────────────────────────────────────────────────────────────
// Eventos do dia `ref` na faixa "dia todo" (prazos + providências). A grade de
// horas fica sem eventos posicionados — audiências fora de escopo.
export function buildDia(eventos: CalEvento[], ref: Date) {
  const iso = toISODate(ref);
  const allday = eventos
    .filter((e) => e.dia === iso)
    .slice(0, 8)
    .map(decorar);

  const horas: CalHora[] = [];
  for (let h = H0; h <= H1; h++)
    horas.push({
      label: (h < 10 ? "0" + h : String(h)) + ":00",
      top: (h - H0) * PX,
    });

  return {
    data: `${String(ref.getDate()).padStart(2, "0")}/${String(
      ref.getMonth() + 1,
    ).padStart(2, "0")}`,
    dow: DOW_LONGO[ref.getDay()],
    allday,
    temAllday: allday.length > 0,
    horas,
    alturaTotal: (H1 - H0 + 1) * PX,
  };
}
