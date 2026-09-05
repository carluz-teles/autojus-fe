// Lógica pura do Pipeline (Board + Funil) sobre as providências reais (action_item)
// — 3 colunas FIXAS por `status` de trabalho (A Fazer=TODO / Em elaboração=WORKING
// / Concluída=DONE). SUGGESTED nunca aparece (o BE não o retorna no board). SEM
// coluna "Revisão". O Pipeline é somente-leitura (sem drag): a mudança de status
// só acontece por ação de domínio (iniciar/comecar/concluir), nunca por arrastar.
// Sem JSX/React: só deriva colunas/funil/aria-label a partir de ActionItemView[].
// As chaves de ícone reusam chaves do StatusIcon legado (components/icons.tsx).

import type { ActionItemView } from "@/features/action-items/types";
import { diasRestantes, rotuloPrazo } from "@/features/shared/prazo";
import { formatarDataCurta } from "@/lib/utils";

import { iniciais } from "../../organization/lib/labels";
import { cnjCurto, urg, type UrgKey } from "./derivar";

// A chave da coluna É o status de trabalho do BE (TODO/WORKING/DONE) — sem
// remapeamento intermediário, a coluna reflete direto o status da providência.
export type PipelineStatusKey = "TODO" | "WORKING" | "DONE";

export const PIPELINE_ORDEM: readonly PipelineStatusKey[] = [
  "TODO",
  "WORKING",
  "DONE",
];

export const PIPELINE_LABEL: Record<PipelineStatusKey, string> = {
  TODO: "A Fazer",
  WORKING: "Em elaboração",
  DONE: "Concluída",
};

// Chave em minúsculo do StatusIcon (components/icons.tsx, tipado PrazoStage) — as
// 3 colunas reusam chaves legadas: "intimacao" (círculo tracejado) = A Fazer,
// "elaboracao" = Em elaboração, "protocolado" (círculo com check) = Concluída.
export type PipelineIconKey = "intimacao" | "elaboracao" | "protocolado";

export const PIPELINE_ICON_KEY: Record<PipelineStatusKey, PipelineIconKey> = {
  TODO: "intimacao",
  WORKING: "elaboracao",
  DONE: "protocolado",
};

const PIPELINE_COR: Record<PipelineStatusKey, string> = {
  TODO: "var(--fg3)",
  WORKING: "var(--primary)",
  DONE: "var(--green)",
};

// Dias corridos até o vencimento, contra HOJE real (hoje resolvido a cada
// chamada — nunca cacheado no módulo).
function diasDaProvidencia(dueDate: string | null): number | null {
  if (!dueDate) return null;
  return diasRestantes(
    dueDate.slice(0, 10),
    new Date().toISOString().slice(0, 10),
  );
}

export interface PipelineCard {
  id: string;
  providencia: string;
  cnjCurto: string;
  court: string;
  dias: number | null;
  prazoLabel: string;
  urgCor: string;
  urgFundo: string;
  urgK: UrgKey;
  respLabel: string;
  respIniciais: string;
  /** Providência que gera peça — mostra o badge "Peça". */
  geraPeca: boolean;
  /** Ciência (não gera peça) — mostra o badge "fluxo curto · ciência". */
  fluxoCurto: boolean;
  /** Tem intimação de origem — mostra o chip "ver intimação". */
  temOrigem: boolean;
  origemHref: string;
  /** Nome acessível ÚNICO do chip "ver intimação" (WCAG 2.4.4). */
  origemAriaLabel: string;
  href: string;
  /** Nome acessível ÚNICO do card (WCAG 2.4.4) — ver buildAriaLabels. */
  ariaLabel: string;
}

// Base do nome acessível: título + local (court · CNJ completo, NÃO truncado)
// + data curta (dd/mm). Ex.: "Contestação — TJSP · 1012473-58..., vence 04/09".
function ariaLabelBase(p: ActionItemView): string {
  const local = [p.court, p.cnj_number].filter(Boolean).join(" · ");
  const data = p.due_date ? formatarDataCurta(p.due_date) : null;
  const vence = data ? `vence ${data}` : "sem prazo definido";
  return local ? `${p.title} — ${local}, ${vence}` : `${p.title} — ${vence}`;
}

/**
 * Garante nome acessível ÚNICO por providência (WCAG 2.4.4 — dois links não podem
 * anunciar o mesmo texto). Quando duas ou mais geram a mesma base, desempata
 * anexando os últimos 6 caracteres do id.
 */
export function buildAriaLabels(
  providencias: ActionItemView[],
): Map<string, string> {
  const bases = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const p of providencias) {
    const base = ariaLabelBase(p);
    bases.set(p.id, base);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const p of providencias) {
    const base = bases.get(p.id) ?? p.title;
    const duplicada = (counts.get(base) ?? 0) > 1;
    out.set(p.id, duplicada ? `${base} · providência ${p.id.slice(-6)}` : base);
  }
  return out;
}

function decorar(
  p: ActionItemView,
  nameFor: (id: string | undefined | null) => string | null,
  ariaLabel: string,
): PipelineCard {
  const dias = diasDaProvidencia(p.due_date);
  const u = urg(dias ?? Number.POSITIVE_INFINITY);
  const nome = nameFor(p.assignee_user_id);
  const cnj = p.cnj_number ? cnjCurto(p.cnj_number) : "";
  return {
    id: p.id,
    providencia: p.title,
    cnjCurto: cnj,
    court: p.court ?? "",
    dias,
    prazoLabel: rotuloPrazo(dias),
    urgCor: u.cor,
    urgFundo: u.fundo,
    urgK: u.k,
    respLabel: nome ?? "—",
    respIniciais: nome ? iniciais(nome) : "—",
    geraPeca: p.gera_peca,
    fluxoCurto: !p.gera_peca,
    temOrigem: !!p.intimation_id,
    origemHref: p.intimation_id ? `/intimacoes/${p.intimation_id}` : "",
    origemAriaLabel: cnj
      ? `Ver intimação de origem — processo ${cnj}`
      : `Ver intimação de origem — ${p.title}`,
    href: `/providencias/${p.id}`,
    ariaLabel,
  };
}

export interface PipelineColumn {
  key: PipelineStatusKey;
  label: string;
  iconKey: PipelineIconKey;
  n: number;
  cards: PipelineCard[];
  vazia: boolean;
}

/** Agrupa as providências em 3 colunas fixas por `status` — client-side, sem
 *  paginação por coluna (a chamada única já trouxe tudo). */
export function buildColumns(
  providencias: ActionItemView[],
  nameFor: (id: string | undefined | null) => string | null,
): PipelineColumn[] {
  const ariaLabels = buildAriaLabels(providencias);
  return PIPELINE_ORDEM.map((key) => {
    const cards = providencias
      .filter((p) => p.status === key)
      .map((p) => decorar(p, nameFor, ariaLabels.get(p.id) ?? p.title))
      .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity));
    return {
      key,
      label: PIPELINE_LABEL[key],
      iconKey: PIPELINE_ICON_KEY[key],
      n: cards.length,
      cards,
      vazia: cards.length === 0,
    };
  });
}

export interface FunilEtapa {
  key: PipelineStatusKey;
  label: string;
  iconKey: PipelineIconKey;
  n: number;
  pct: string;
  barW: string;
  cor: string;
}

/** 3 barras (A Fazer/Em elaboração/Concluída) — as 3 contam igual. */
export function buildFunil(providencias: ActionItemView[]): FunilEtapa[] {
  const counts = PIPELINE_ORDEM.map(
    (k) => providencias.filter((p) => p.status === k).length,
  );
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...counts, 1);
  return PIPELINE_ORDEM.map((key, i) => {
    const n = counts[i];
    return {
      key,
      label: PIPELINE_LABEL[key],
      iconKey: PIPELINE_ICON_KEY[key],
      n,
      pct: Math.round((n / total) * 100) + "%",
      barW: Math.round((n / max) * 100) + "%",
      cor: PIPELINE_COR[key],
    };
  });
}
