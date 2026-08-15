// Seleção do "próximo prazo" — lógica compartilhada entre a aba do processo
// (usePrazosDoProcesso) e a ponte cliente da lista (useProcessosPrazos). Função
// pura e testável; nada de cálculo no JSX (Regra nº1: uma fonte).

import type { PrazoStatus, PrazoView } from "../types";

/** Prazos que ainda correm — candidatos ao "próximo prazo". */
export const LIVE_STATUS: ReadonlySet<PrazoStatus> = new Set<PrazoStatus>([
  "OPEN",
  "PENDING",
]);

/** true quando o prazo está vivo (OPEN/PENDING) e pode ser o "herói". */
export function isLivePrazo(prazo: PrazoView): boolean {
  return LIVE_STATUS.has(prazo.status);
}

/**
 * Herói: o prazo vivo (OPEN/PENDING) de menor `days_left`. Retorna null quando
 * não há prazo em aberto. Empata empatando no primeiro (reduce estável).
 */
export function selectProximoPrazo(prazos: PrazoView[]): PrazoView | null {
  const live = prazos.filter(isLivePrazo);
  if (live.length === 0) return null;
  return live.reduce((menor, p) => (p.days_left < menor.days_left ? p : menor));
}
