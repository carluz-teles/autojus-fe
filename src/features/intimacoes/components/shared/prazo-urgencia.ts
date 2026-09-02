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

/** Legenda textual do contador ("dias em atraso"/"vence hoje"/"dias restantes"),
 *  a partir de {atrasado, hoje, magnitude} — extraída de PrazoContagemGrande
 *  (Regra nº1) pra ser reaproveitada também pela pílula "Prazo:" do breadcrumb
 *  de Providências (docs/design-card-providencias-v2.md §2): o dado real não
 *  guarda "N dias úteis" pronto, então reusamos a MESMA contagem/legenda já
 *  exibida no contador grande, em vez de recalcular. */
export function legendaDiasRestantes(info: PrazoUrgenciaInfo): string {
  if (info.atrasado)
    return info.magnitude === 1 ? "dia em atraso" : "dias em atraso";
  if (info.hoje) return "vence hoje";
  return info.magnitude === 1 ? "dia restante" : "dias restantes";
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

// Variante para uso como cor de TEXTO (rótulo "vence hoje"/"em N dias" da lista,
// número grande do PrazoContagemGrande) — nas faixas hoje/48h, --gold PURO como
// texto normal dá ~2.4:1 contra o fundo claro (falha WCAG AA 1.4.3, que exige
// 4,5:1). --gold-foreground é o MESMO token, só mais escuro — já usado como texto
// em intimacao-detail.tsx/peca-row.tsx/analisar-card.tsx/confirmar-prazo.tsx.
// corUrgencia() continua valendo para usos decorativos (fio da linha = boundary
// de UI, exige só 3:1) — não trocar lá, senão perde a cor "latão" do design.
const COR_TEXTO_URGENCIA: Record<Urgencia, string> = {
  ...COR_URGENCIA,
  hoje: "var(--gold-foreground)",
  "48h": "var(--gold-foreground)",
};

export function corTextoUrgencia(prazo: IntimacaoPrazoView | null): string {
  return COR_TEXTO_URGENCIA[urgenciaDePrazo(prazo)];
}
