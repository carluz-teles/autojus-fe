// Lógica pura de urgência do prazo — extraída de intimacao-detail.tsx (Regra nº1):
// tanto o contador grande do detalhe (PrazoContagemGrande) quanto o contador compacto
// do painel lateral do master-detail (intimacoes-view.tsx) e a cor da borda esquerda
// da linha da lista derivam do MESMO days_left. Uma só fonte de verdade para "atrasado
// vs vence hoje vs dias restantes" e a cor de urgência associada.

import type { IntimacaoPrazoView } from "../../types";

export interface PrazoUrgenciaInfo {
  dias: number;
  magnitude: number;
  atrasado: boolean;
  hoje: boolean;
  /** Classe Tailwind de cor de texto (tokens do tema). */
  corClass: string;
}

/** Deriva {atrasado, hoje, cor} a partir de days_left — null quando não há prazo. */
export function prazoUrgenciaInfo(
  prazo: IntimacaoPrazoView | null,
): PrazoUrgenciaInfo | null {
  if (!prazo) return null;
  const dias = prazo.days_left;
  const atrasado = dias < 0;
  const hoje = dias === 0;
  const corClass = atrasado
    ? "text-destructive"
    : dias <= 3
      ? "text-[var(--gold-foreground)]"
      : "text-foreground";
  return { dias, magnitude: Math.abs(dias), atrasado, hoje, corClass };
}
