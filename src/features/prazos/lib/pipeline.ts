// Lógica pura do Pipeline (Board + Funil) sobre TAREFAS reais — 3 estágios FIXOS
// de produção da peça (Elaboração/Revisão/Protocolado), vindos do `pipeline_stage`
// do BE (projeção pura, sem campo gravável equivalente — por isso o Pipeline é
// somente-leitura, sem drag). Sem JSX/React: só deriva colunas/funil/aria-label a
// partir de TaskView[]. As chaves de ícone/rótulo coincidem com 3 das 6 chaves do
// PrazoStage legado (StatusIcon em components/icons.tsx) — reuso direto.

import { diasRestantes, rotuloPrazo } from "@/features/shared/prazo";
import type { TaskView } from "@/features/tasks/types";
import { formatarDataCurta } from "@/lib/utils";

import { iniciais } from "../../organization/lib/labels";
import { cnjCurto, urg, type UrgKey } from "./derivar";

export type PipelineStageKey = "ELABORACAO" | "REVISAO" | "PROTOCOLADO";

export const PIPELINE_ORDEM: readonly PipelineStageKey[] = [
  "ELABORACAO",
  "REVISAO",
  "PROTOCOLADO",
];

export const PIPELINE_LABEL: Record<PipelineStageKey, string> = {
  ELABORACAO: "Em elaboração",
  REVISAO: "Revisão do sócio",
  PROTOCOLADO: "Protocolado",
};

// Chave em minúsculo do StatusIcon (components/icons.tsx, tipado PrazoStage) —
// os 3 estágios do pipeline_stage coincidem 1:1 com 3 das 6 chaves legadas.
export const PIPELINE_ICON_KEY: Record<
  PipelineStageKey,
  "elaboracao" | "revisao" | "protocolado"
> = {
  ELABORACAO: "elaboracao",
  REVISAO: "revisao",
  PROTOCOLADO: "protocolado",
};

const PIPELINE_COR: Record<PipelineStageKey, string> = {
  ELABORACAO: "var(--primary)",
  REVISAO: "var(--gold)",
  PROTOCOLADO: "var(--green)",
};

// Dias corridos até o vencimento, contra HOJE real (hoje resolvido a cada
// chamada — nunca cacheado no módulo). Espelha o helper local (não exportado)
// de use-prazos-fila.ts — não extraído pra não tocar a fatia A já aprovada.
function diasDaTarefa(dueDate: string | null): number | null {
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
  /** Tem intimação de origem (t.intimation_id) — mostra o chip "ver intimação". */
  temOrigem: boolean;
  origemHref: string;
  /** Nome acessível ÚNICO do chip "ver intimação" (WCAG 2.4.4) — reusa o mesmo
   *  cnjCurto do card pra diferenciar cards com origem (senão todo chip
   *  anuncia o texto idêntico "ver intimação"). Só relevante quando temOrigem. */
  origemAriaLabel: string;
  href: string;
  /** Nome acessível ÚNICO do card (WCAG 2.4.4) — ver buildAriaLabels. */
  ariaLabel: string;
}

// Base do nome acessível: título + local (court · CNJ completo, NÃO truncado)
// + data curta (dd/mm). Ex.: "Contestação — TJSP · 1012473-58..., vence 04/09".
function ariaLabelBase(t: TaskView): string {
  const local = [t.court, t.cnj_number].filter(Boolean).join(" · ");
  const data = t.due_date ? formatarDataCurta(t.due_date) : null;
  const vence = data ? `vence ${data}` : "sem prazo definido";
  return local ? `${t.title} — ${local}, ${vence}` : `${t.title} — ${vence}`;
}

/**
 * Garante nome acessível ÚNICO por tarefa (WCAG 2.4.4 — dois links não podem
 * anunciar o mesmo texto). Quando duas ou mais tarefas geram a mesma base
 * (título/CNJ/urgência idênticos), desempata anexando os últimos 6 caracteres
 * do id — suficiente pra nunca colidir, sem poluir o rótulo no caso comum
 * (nenhuma colisão).
 */
export function buildAriaLabels(tasks: TaskView[]): Map<string, string> {
  const bases = new Map<string, string>();
  const counts = new Map<string, number>();
  for (const t of tasks) {
    const base = ariaLabelBase(t);
    bases.set(t.id, base);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  const out = new Map<string, string>();
  for (const t of tasks) {
    const base = bases.get(t.id) ?? t.title;
    const duplicada = (counts.get(base) ?? 0) > 1;
    out.set(t.id, duplicada ? `${base} · tarefa ${t.id.slice(-6)}` : base);
  }
  return out;
}

function decorar(
  t: TaskView,
  nameFor: (id: string | undefined | null) => string | null,
  ariaLabel: string,
): PipelineCard {
  const dias = diasDaTarefa(t.due_date);
  const u = urg(dias ?? Number.POSITIVE_INFINITY);
  const nome = nameFor(t.assignee_user_id);
  const cnj = t.cnj_number ? cnjCurto(t.cnj_number) : "";
  return {
    id: t.id,
    providencia: t.title,
    cnjCurto: cnj,
    court: t.court ?? "",
    dias,
    prazoLabel: rotuloPrazo(dias),
    urgCor: u.cor,
    urgFundo: u.fundo,
    urgK: u.k,
    respLabel: nome ?? "—",
    respIniciais: nome ? iniciais(nome) : "—",
    temOrigem: !!t.intimation_id,
    origemHref: t.intimation_id ? `/intimacoes/${t.intimation_id}` : "",
    origemAriaLabel: cnj
      ? `Ver intimação de origem — processo ${cnj}`
      : `Ver intimação de origem — ${t.title}`,
    href: `/tarefas/${t.id}`,
    ariaLabel,
  };
}

export interface PipelineColumn {
  key: PipelineStageKey;
  label: string;
  iconKey: "elaboracao" | "revisao" | "protocolado";
  n: number;
  cards: PipelineCard[];
  vazia: boolean;
}

/** Agrupa as tarefas em 3 colunas fixas por `pipeline_stage` — client-side,
 *  sem paginação por coluna (a chamada única já trouxe tudo). */
export function buildColumns(
  tasks: TaskView[],
  nameFor: (id: string | undefined | null) => string | null,
): PipelineColumn[] {
  const ariaLabels = buildAriaLabels(tasks);
  return PIPELINE_ORDEM.map((key) => {
    const cards = tasks
      .filter((t) => t.pipeline_stage === key)
      .map((t) => decorar(t, nameFor, ariaLabels.get(t.id) ?? t.title))
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
  key: PipelineStageKey;
  label: string;
  iconKey: "elaboracao" | "revisao" | "protocolado";
  n: number;
  pct: string;
  barW: string;
  cor: string;
}

/** 3 barras (Elaboração/Revisão/Protocolado) — todas "ativas" por definição
 *  (Protocolado é o fim natural do pipeline, não uma exclusão). Sem "gargalo". */
export function buildFunil(tasks: TaskView[]): FunilEtapa[] {
  const counts = PIPELINE_ORDEM.map(
    (k) => tasks.filter((t) => t.pipeline_stage === k).length,
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
