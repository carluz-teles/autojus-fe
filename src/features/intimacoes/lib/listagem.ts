import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { ORIGEM_DESCRICAO, ORIGEM_LABEL } from "@/features/triagem/lib/origem";
import { formatarData } from "@/lib/utils";

import type {
  IntimacaoGroup,
  IntimacaoView,
  RecommendedProvidencia,
} from "../types";
import { tipoAtoLabel } from "./tipo-ato";

export const SITUACAO_LABEL = {
  PENDING: "Pendente",
  RESOLVED: "Resolvida",
  IGNORED: "Ignorada",
};
export const ETAPA_LABEL = {
  RECEIVED: "Recebida",
  AWAITING_CONFIRMATION: "Aguardando confirmação",
  CONFIRMED: "Prazo confirmado",
  DRAFTING: "Em elaboração",
  PARTNER_REVIEW: "Revisão do sócio",
  FILED: "Protocolada",
};
export const cnjKey = (cnj: string) => cnj.replace(/\D/g, "");

export function revisaoDaLinha(i: IntimacaoView) {
  const p = i.prazo;
  if (
    i.user_status !== "PENDING" ||
    ["MET", "CANCELLED", "RESOLVED_ON_CONCLUSION"].includes(p?.status ?? "")
  )
    return { label: "", pending: false };
  if (i.estado === "a_classificar")
    return {
      label: "Definir tipo e prazo",
      pending: true,
      description:
        "O sistema não conseguiu classificar este item. Revise a publicação para definir o tipo de ato e se existe prazo.",
    };
  if (p?.selo === "a_apurar" || (!p?.confirmed && i.estado === "ia"))
    return {
      label: i.estado === "ia" ? "Revisar tipo e prazo" : "Revisar prazo",
      pending: true,
      description:
        i.estado === "ia"
          ? "A confirmar: o advogado precisa revisar o tipo de ato sugerido e o prazo, corrigindo o que for necessário antes de confirmar. Essa confirmação é interna ao app; não dá ciência nem protocola no tribunal."
          : "O prazo precisa de revisão do advogado antes da confirmação, por exemplo por divergência entre a publicação e o cálculo. Essa confirmação é interna ao app; não dá ciência nem protocola no tribunal.",
    };
  if (p?.confirmed)
    return {
      label:
        p.status === "NO_DEADLINE"
          ? "Ausência de prazo revisada"
          : "Prazo revisado",
      pending: false,
    };
  return { label: "", pending: false };
}

// lifecycleDaLinha deriva o estado do lifecycle async da análise para o card da Triagem:
//  • "recommended" — a análise materializou providência (mostra a Ação recomendada inline);
//  • "analyzing"   — chegou com prazo real, não pendente de confirmação e ainda não analisada
//                    (a análise async está rodando — mostra "Analisando…");
//  • "none"        — nada a sinalizar (resolvida/ignorada, sem prazo, ou pendente de confirmação,
//                    caso já coberto por revisaoDaLinha → "Revisar tipo e prazo").
// Pendentes de confirmação NÃO entram em "analyzing": não são auto-analisadas (o BE só dispara
// a análise em prazo confiável), então a linha mostra o CTA de confirmação, não o spinner.
export type LinhaLifecycle =
  | { state: "recommended"; rec: RecommendedProvidencia; count: number }
  | { state: "analyzing" }
  | { state: "none" };

export function lifecycleDaLinha(i: IntimacaoView): LinhaLifecycle {
  const p = i.prazo;
  // A "Ação recomendada" (com Gerar peça/Concluir) só faz sentido num prazo ABERTO e real —
  // espelha o lane `ready`. VENCIDO (histórico, assume-se feito) e SEM PRAZO (mera ciência) NÃO
  // recebem ação recomendada, mesmo que a análise tenha materializado uma providência (o backfill
  // analisou tudo antes do skip de vencido). Aberto = PENDING/OPEN e não vencido (days_left >= 0).
  const abertoReal =
    !!p && ["PENDING", "OPEN"].includes(p.status) && p.days_left >= 0;
  if (i.recommended_providencia && abertoReal)
    return {
      state: "recommended",
      rec: i.recommended_providencia,
      count: i.suggested_count,
    };
  const pending = revisaoDaLinha(i).pending;
  if (
    i.user_status === "PENDING" &&
    !pending &&
    !i.ai_analyzed_at &&
    abertoReal
  )
    return { state: "analyzing" };
  return { state: "none" };
}

export function vencimentoDaLinha(i: IntimacaoView) {
  const p = i.prazo;
  if (!p || p.status === "NO_DEADLINE")
    return {
      data: i.estado === "a_classificar" ? "A definir" : "Sem prazo",
      relative: "",
      alert: false,
      activeDate: null as string | null,
    };
  const active =
    i.user_status === "PENDING" && ["PENDING", "OPEN"].includes(p.status);
  const relative =
    p.status === "MET"
      ? "Prazo cumprido"
      : p.status === "CANCELLED"
        ? "Prazo cancelado"
        : !active
          ? "Vencimento registrado"
          : p.days_left < 0
            ? `${-p.days_left} dias corridos em atraso`
            : p.days_left === 0
              ? "Vence hoje"
              : `${p.days_left} dias corridos restantes`;
  return {
    data: formatarData(p.end_date),
    relative,
    alert: active && p.days_left <= 2,
    activeDate: active ? p.end_date : null,
  };
}

export function linhaIntimacao(i: IntimacaoView) {
  return {
    id: i.id,
    cnj: formatarCNJ(i.cnj_number),
    title: i.title.replace(/\s*·\s*$/, ""),
    partes: [i.autor, i.reu].filter(Boolean).join(" · "),
    tribunal: [i.court, i.degree].filter(Boolean).join(" · "),
    ato: i.prazo?.tipo_ato ? tipoAtoLabel(i.prazo.tipo_ato) : "Tipo a definir",
    origem: ORIGEM_LABEL[i.estado] ?? "",
    origemDescricao: ORIGEM_DESCRICAO[i.estado],
    revisao: revisaoDaLinha(i),
    lifecycle: lifecycleDaLinha(i),
    prazo: vencimentoDaLinha(i),
    responsavelId: i.assignee_user_id,
    responsavel:
      i.assignee_user_name?.trim() ||
      (i.assignee_user_id ? "Responsável atribuído" : "Sem responsável"),
    situacao: SITUACAO_LABEL[i.user_status],
    etapa: ["DRAFTING", "PARTNER_REVIEW", "FILED"].includes(i.work_stage)
      ? ETAPA_LABEL[i.work_stage]
      : "",
    publicado: i.published_at ? formatarData(i.published_at) : "Não informada",
    preview: i.content_preview,
  };
}

// These groups are complete: the backend paginates CNJs before returning their children.
export function gruposIntimacoes(
  items: IntimacaoView[],
  groups: IntimacaoGroup[],
) {
  const byCNJ = new Map<string, IntimacaoView[]>();
  for (const item of items) {
    const key = cnjKey(item.cnj_number);
    const group = byCNJ.get(key) ?? [];
    group.push(item);
    byCNJ.set(key, group);
  }
  return groups.map((g) => {
    const children = byCNJ.get(g.cnj_number) ?? [];
    const first = children[0];
    const urgent = children
      .filter((i) => vencimentoDaLinha(i).activeDate)
      .sort((a, b) => a.prazo!.end_date.localeCompare(b.prazo!.end_date))[0];
    const pending = children.filter((i) => revisaoDaLinha(i).pending);
    const missing = pending.filter((i) => i.estado === "a_classificar").length;
    const confirm = pending.filter((i) => i.estado === "ia").length;
    const revisar = pending.length - missing - confirm;
    const responsible = new Set(children.map((i) => i.assignee_user_id ?? ""));
    return {
      ...g,
      cnj: formatarCNJ(g.cnj_number),
      title: first ? linhaIntimacao(first).title : "Processo",
      partes: first ? linhaIntimacao(first).partes : "",
      items: children.map(linhaIntimacao),
      urgente: urgent ? vencimentoDaLinha(urgent) : null,
      pending: pending.length,
      pendencias: [
        missing ? `${missing} a classificar` : "",
        confirm ? `${confirm} para revisar tipo e prazo` : "",
        revisar ? `${revisar} para revisar prazo` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      responsavelId: responsible.size === 1 ? first?.assignee_user_id : null,
      responsaveisDiferentes: responsible.size > 1,
      responsavel:
        responsible.size > 1
          ? "Responsáveis diferentes"
          : first
            ? linhaIntimacao(first).responsavel
            : "Sem responsável",
    };
  });
}
