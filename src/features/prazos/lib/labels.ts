// Humanizações do prazo (deadline) num só lugar — a lista de agenda consome
// daqui; nada de cálculo no JSX (Regra nº1). O rótulo de status derivado casa
// com o helper de tom do DS (prazoTone), que resolve a cor a partir do texto.

import type { PrazoStatus } from "../types";

// Rótulo do tipo de ato do prazo (deadline.tipo_ato) — fonte única em
// intimacoes/lib/tipo-ato.ts (Regra nº1: um só mapa app-wide). Reexportado aqui
// para os consumidores da feature prazos que já importavam de "../lib/labels".
export { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";

/**
 * Rótulo de situação derivado de (status, days_left) — a única fonte da coluna
 * STATUS e do filtro por card. Regras: MET→Cumprido; MISSED ou vencido→Vencido;
 * OPEN e ≤1 dia→Crítico; OPEN e ≤3 dias→Vencendo; OPEN→Aberto; PENDING/futuro→
 * Futuro. Casa com prazoTone (danger|warning|info|success|neutral).
 */
export function prazoStatusLabel(
  status: PrazoStatus,
  daysLeft: number,
): string {
  if (status === "MET") return "Cumprido";
  if (status === "CANCELLED") return "Cancelado";
  if (status === "MISSED" || daysLeft < 0) return "Vencido";
  if (status === "OPEN") {
    if (daysLeft <= 1) return "Crítico";
    if (daysLeft <= 3) return "Vencendo";
    return "Aberto";
  }
  return "Futuro";
}

const dayFormatter = new Intl.NumberFormat("pt-BR");

/** Dias restantes humanizados — "hoje", "N dias" (futuro), "N dias em atraso". */
export function daysLeftLabel(daysLeft: number): string {
  if (daysLeft === 0) return "hoje";
  const abs = dayFormatter.format(Math.abs(daysLeft));
  const unit = Math.abs(daysLeft) === 1 ? "dia" : "dias";
  return daysLeft < 0 ? `${abs} ${unit} em atraso` : `${abs} ${unit}`;
}
