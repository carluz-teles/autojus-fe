import type { Tom } from "@/components/mock-ui/status-badge";

import type { CaptureDisplayStatus, CaptureKind } from "../types";

// ─── Formatadores de data (pt-BR) ────────────────────────────────────────────

const fmtDia = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const fmtDiaAno = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Formata um RFC3339 como:
 * - "hoje, 06:10"      — se a data for hoje
 * - "ontem, 06:10"     — se for ontem
 * - "13/08, 22:04"     — caso contrário (dd/MM, HH:mm)
 * Retorna "—" se null.
 */
export function fmtQuando(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";

  const agora = new Date();
  const hojeStr = fmtDia.format(agora);
  const dStr = fmtDia.format(d);
  const hora = fmtHora.format(d);

  if (dStr === hojeStr) return `hoje, ${hora}`;

  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  if (dStr === fmtDia.format(ontem)) return `ontem, ${hora}`;

  return `${dStr}, ${hora}`;
}

/**
 * Formata a janela da captura de acordo com o kind:
 * - DAILY_CAPTURE → "19/08/2026" (data única via window_from)
 * - INITIAL_LOAD e ENRICHMENT → "13/08/25 – 13/08/26" (intervalo da importação; o
 *   enriquecimento é filho do backfill e herda a janela dele via join no BE)
 * - ENRICHMENT sem janela (fallback histórico) → "incremental"
 */
export function fmtJanela(
  kind: CaptureKind,
  windowFrom: string | null,
  windowTo: string | null,
): string {
  if (kind === "DAILY_CAPTURE") {
    if (!windowFrom) return "—";
    const d = new Date(`${windowFrom}T00:00:00`);
    if (Number.isNaN(d.getTime())) return windowFrom;
    return fmtDia.format(d) + "/" + d.getFullYear();
  }

  // INITIAL_LOAD e ENRICHMENT herdam a janela da importação (intervalo). ENRICHMENT
  // sem janela cai no rótulo "incremental" (enriquecimento contínuo, sem import).
  if (!windowFrom || !windowTo) return kind === "ENRICHMENT" ? "incremental" : "—";
  const f = new Date(`${windowFrom}T00:00:00`);
  const t = new Date(`${windowTo}T00:00:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    return `${windowFrom} – ${windowTo}`;
  }
  return `${fmtDiaAno.format(f)} – ${fmtDiaAno.format(t)}`;
}

/** Rótulo legível do kind. */
export function kindLabel(kind: CaptureKind): string {
  switch (kind) {
    case "DAILY_CAPTURE":
      return "Captura diária";
    case "ENRICHMENT":
      return "Enriquecimento";
    case "INITIAL_LOAD":
      return "Carga inicial";
  }
}

/** Mapeia display_status → Tom do StatusBadge. */
export function statusTom(status: CaptureDisplayStatus): Tom {
  switch (status) {
    case "Concluída":
      return "success";
    case "Concluída com avisos":
      return "warning";
    case "Falha parcial":
      return "danger";
    case "Em andamento":
      return "info";
  }
}

/**
 * Formata duration_sec como "4 min 12 s". Retorna "—" se null.
 */
export function fmtDuracao(sec: number | null): string {
  if (sec === null) return "—";
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${min} min ${s} s` : `${min} min`;
}

/** Formatador de inteiros pt-BR (milhar com ponto). */
export const fmtInt = new Intl.NumberFormat("pt-BR");

