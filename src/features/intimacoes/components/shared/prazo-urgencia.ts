// Lógica pura de urgência do prazo — extraída de intimacao-detail.tsx (Regra nº1):
// o contador grande do detalhe (PrazoContagemGrande), o contador do painel lateral
// do master-detail e a cor do fio esquerdo da linha da lista derivam do MESMO
// days_left. Uma só fonte de verdade para "atrasado vs vence hoje vs dias restantes"
// e para a COR de urgência — idêntica ao system design (corDaUrgencia): o fio da
// linha, o texto do prazo e o número grande do preview usam a MESMA cor.

import type { IntimacaoPrazoView } from "../../types";

export interface PrazoUrgenciaInfo {
  dias: number;
  magnitude: number;
  atrasado: boolean;
  hoje: boolean;
}

/** Deriva {atrasado, hoje, magnitude} a partir de days_left — null sem prazo. */
export function prazoUrgenciaInfo(
  prazo: IntimacaoPrazoView | null,
): PrazoUrgenciaInfo | null {
  if (!prazo) return null;
  const dias = prazo.days_left;
  return {
    dias,
    magnitude: Math.abs(dias),
    atrasado: dias < 0,
    hoje: dias === 0,
  };
}

export type Urgencia = "atraso" | "hoje" | "48h" | "7d" | "sem";

/** Faixa de urgência a partir de days_left — null = "sem" (sem prazo). */
export function urgenciaDePrazo(prazo: IntimacaoPrazoView | null): Urgencia {
  if (!prazo) return "sem";
  const d = prazo.days_left;
  if (d < 0) return "atraso";
  if (d === 0) return "hoje";
  if (d <= 2) return "48h";
  return "7d";
}

// Cores EXATAS do system design (corDaUrgencia): atraso=vermelho, hoje/48h=latão,
// esta-semana=cinza, sem-prazo=cinza fraco. CSS var pra aplicar via inline style
// (fio da linha, texto do prazo, número grande) — mesmo padrão do design.
const COR_URGENCIA: Record<Urgencia, string> = {
  atraso: "var(--destructive)",
  hoje: "var(--gold)",
  "48h": "var(--gold)",
  "7d": "var(--muted-foreground)",
  sem: "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
};

export function corUrgencia(prazo: IntimacaoPrazoView | null): string {
  return COR_URGENCIA[urgenciaDePrazo(prazo)];
}
