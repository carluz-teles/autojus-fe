// Humanizações do prazo (deadline) num só lugar — a lista de agenda consome
// daqui; nada de cálculo no JSX (Regra nº1). O rótulo de status derivado casa
// com o helper de tom do DS (prazoTone), que resolve a cor a partir do texto.

import type { PrazoAnchorEvent, PrazoStatus } from "../types";

// Rótulo do tipo de ato do prazo (deadline.tipo_ato) — fonte única em
// intimacoes/lib/tipo-ato.ts (Regra nº1: um só mapa app-wide). Reexportado aqui
// para os consumidores da feature prazos que já importavam de "../lib/labels".
export { tipoAtoLabel } from "@/features/intimacoes/lib/tipo-ato";

/**
 * Rótulos pt-BR do termo inicial (deadline.anchor_event) — de onde a contagem
 * começa. FONTE ÚNICA app-wide: o card "Por que essa data?", a memória do cálculo
 * e o select de revisão leem daqui. Antes o card/memória imprimiam o enum cru
 * ("PUBLISHED") e o select repetia os rótulos inline no JSX.
 * A ORDEM das chaves é a ordem do select — o default do BE (DEADLINE_START) primeiro.
 */
const TERMO_INICIAL_LABEL: Record<PrazoAnchorEvent, string> = {
  DEADLINE_START: "Início informado na intimação",
  PUBLISHED: "Publicação",
  MADE_AVAILABLE: "Disponibilização",
};

/** Opções do select de revisão, derivadas do mapa (mesma mecânica de
 *  TIPOS_COM_PRAZO em lib/confirmacao.ts) — um marco novo entra em UM lugar. */
export const TERMO_INICIAL_OPCOES = Object.entries(TERMO_INICIAL_LABEL);

/**
 * Rótulo do termo inicial. `anchor_event` chega como string aberta no
 * CalculationSnapshot (o BE pode ganhar um marco novo), então valor desconhecido
 * — ou "" — cai no `fallback` em vez de vazar o enum na tela.
 */
export function termoInicialLabel(
  anchorEvent: string,
  fallback = "Marco não registrado",
): string {
  return TERMO_INICIAL_LABEL[anchorEvent as PrazoAnchorEvent] ?? fallback;
}

/**
 * Regime de contagem (deadline.counting) como ADJETIVO — "úteis" | "corridos" —
 * porque cada tela compõe a frase de um jeito ("15 dias úteis", "Dias corridos").
 * Fonte única do ternário que estava copiado em 5 telas; mantém a política
 * vigente: só BUSINESS conta em dias úteis, qualquer outro valor conta corrido.
 */
export function contagemLabel(counting: string): string {
  return counting === "BUSINESS" ? "úteis" : "corridos";
}

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
