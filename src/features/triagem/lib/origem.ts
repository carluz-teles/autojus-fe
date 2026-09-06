// Abas de origem do prazo da Triagem — rótulos e derivação das abas visíveis a
// partir das `origem_facets` do envelope. Fonte única de "origem → rótulo pt-BR"
// (Regra nº1: nada de rótulo hard-coded no JSX). O closed set espelha o BE
// (?origem=<v>); a aba "Todos" é sintetizada aqui, não vem nas facets.

import type {
  IntimacaoOrigem,
  OrigemFacets,
} from "@/features/intimacoes/types";

/**
 * Rótulo pt-BR de cada origem. `ia → "Inferido"` (NUNCA "IA" — diretiva
 * app-wide: comunicar pela ação, não pela tecnologia).
 */
export const ORIGEM_LABEL: Record<IntimacaoOrigem, string> = {
  declarado: "Declarado",
  validado: "Validado",
  calculado: "Calculado",
  divergente: "Divergente",
  ia: "Inferido",
  manual: "Manual",
  a_classificar: "A classificar",
  sem_prazo: "Sem prazo",
};

/**
 * Tom do selo de origem inline do card (espelha o `origemFundo`/`origemCor` do
 * design). Regra nº1: uma só fonte de "origem → cor do selo".
 *   - "confiavel" (verde) = origens em que o prazo já é confiável: declarado,
 *     validado, calculado.
 *   - "apurar" (dourado/âmbar) = estados que ainda pedem ação: ia (inferido),
 *     divergente e a_classificar (o motor não soube → pendência humana).
 *   - "neutro" (cinza) = manual e sem_prazo.
 * Os valores são classes utilitárias (bg/text) sobre os tokens do design system
 * (--green/--gold), aplicadas via className no selo do card.
 */
export type OrigemTom = "confiavel" | "apurar" | "neutro";

export const ORIGEM_TOM: Record<IntimacaoOrigem, OrigemTom> = {
  declarado: "confiavel",
  validado: "confiavel",
  calculado: "confiavel",
  divergente: "apurar",
  ia: "apurar",
  manual: "neutro",
  a_classificar: "apurar",
  sem_prazo: "neutro",
};

/** Classe do selo de origem por tom — fundo suave + texto do mesmo matiz, no
 *  espírito do selo "confiável/a apurar" do design (bg 10% + text token). */
export const ORIGEM_TOM_CLASS: Record<OrigemTom, string> = {
  confiavel: "bg-green/10 text-green",
  apurar: "bg-gold/10 text-gold-foreground",
  neutro: "bg-muted text-muted-foreground",
};

/** Ordem canônica das abas de origem (mais "confiável"/comum primeiro). */
export const ORIGEM_ORDER: IntimacaoOrigem[] = [
  "declarado",
  "validado",
  "calculado",
  "divergente",
  "ia",
  "a_classificar",
  "manual",
  "sem_prazo",
];

/** Uma aba de origem pronta pra renderizar (pill com rótulo + contagem). */
export interface AbaOrigem {
  /** Valor a enviar em `?origem=`; null = aba "Todos" (sem filtro). */
  value: IntimacaoOrigem | null;
  label: string;
  count: number;
}

export const ABA_TODOS_LABEL = "Todos";

/**
 * Monta as abas visíveis: "Todos" (sempre) seguida das origens com facet > 0, na
 * ordem canônica. Origens com contagem 0 ficam ocultas — a fileira de abas é
 * dinâmica (só aparece o que tem item). Não depende do estado de seleção (o
 * destaque da aba ativa é decidido na view).
 *
 * A contagem de "Todos" é a SOMA dos facets — não o `total_count` da resposta.
 * Os facets são independentes do filtro `?origem=` (o BE os calcula ignorando a
 * própria dimensão de origem), então a soma é sempre o total real da Triagem
 * (2035), enquanto `total_count` encolhe pro total FILTRADO quando uma aba de
 * origem está ativa — o que faria "Todos" mostrar o número errado.
 */
export function abasVisiveis(facets: OrigemFacets): AbaOrigem[] {
  const total = ORIGEM_ORDER.reduce((soma, origem) => soma + facets[origem], 0);
  const abas: AbaOrigem[] = [
    { value: null, label: ABA_TODOS_LABEL, count: total },
  ];
  for (const origem of ORIGEM_ORDER) {
    const count = facets[origem];
    if (count > 0) {
      abas.push({ value: origem, label: ORIGEM_LABEL[origem], count });
    }
  }
  return abas;
}
