import { formatarCNJ } from "@/features/prazos/lib/detalhe-apresentacao";
import { grauProcessoLabel } from "@/features/processos/lib/apresentacao";
import { formatarData } from "@/lib/utils";

import type { IntimacaoGroup, IntimacaoView } from "../types";
import { estadoIntimacao } from "./estado";
import { atoPublicacaoLabel, tituloIntimacao } from "./labels";

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
  VENCIDA: "Prazo vencido",
};
const cnjKey = (cnj: string) => cnj.replace(/\D/g, "");

function vencimentoDaLinha(i: IntimacaoView) {
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
    title: tituloIntimacao(i.title, i.cnj_number),
    partes: [i.autor, i.reu].filter(Boolean).join(" · "),
    tribunal: [i.court, grauProcessoLabel(i.degree)]
      .filter(Boolean)
      .join(" · "),
    ato: atoPublicacaoLabel(i.ai_act, i.prazo?.tipo_ato, i.type),
    // estado (desfecho) — chip único: Pendente/Em elaboração/Em revisão/Concluída·Ciência/
    // Concluída·Protocolada/Ignorada. A linha só mostra quando NÃO é "Pendente" (a barra de
    // prazo já cobre a intimação aberta comum); ver estadoIntimacao.
    estado: estadoIntimacao(i),
    prazo: vencimentoDaLinha(i),
    responsavelId: i.assignee_user_id,
    responsavel:
      i.assignee_user_name?.trim() ||
      (i.assignee_user_id ? "Responsável atribuído" : "Sem responsável"),
    situacao: SITUACAO_LABEL[i.user_status],
    etapa: ["DRAFTING", "PARTNER_REVIEW", "FILED"].includes(i.work_stage)
      ? ETAPA_LABEL[i.work_stage]
      : "",
    // H2 (docs history-design.md): published_at é a âncora cronológica; quando o
    // DJEN não informa a data de publicação em si, cai no instante em que a
    // captura ficou disponível (made_available_at) — nunca "Não informada" se
    // qualquer um dos dois existir. made_available_at NÃO É a publicação: o
    // rótulo (`publicadoRotulo`) muda conforme a fonte real, pra nunca afirmar
    // "Publicada" quando o dado é só "ficou disponível pra nós".
    publicado: i.published_at
      ? formatarData(i.published_at)
      : i.made_available_at
        ? formatarData(i.made_available_at)
        : "Não informada",
    publicadoRotulo: i.published_at ? "Publicada" : "Disponibilizada",
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
    const responsible = new Set(children.map((i) => i.assignee_user_id ?? ""));
    return {
      ...g,
      cnj: formatarCNJ(g.cnj_number),
      title: first ? linhaIntimacao(first).title : "Processo",
      partes: first ? linhaIntimacao(first).partes : "",
      items: children.map(linhaIntimacao),
      urgente: urgent ? vencimentoDaLinha(urgent) : null,
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
