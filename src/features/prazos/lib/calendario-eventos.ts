import { STATUS_LABEL } from "@/features/action-items/lib/status-pill";
import type { ActionItemView } from "@/features/action-items/types";
import { diasRestantes } from "@/features/shared/prazo";

import type { PrazoAgendaView } from "../types";
import type { CalEvento } from "./calendario";
import { formatarCNJ } from "./detalhe-apresentacao";
import { prazoStatusLabel, tipoAtoLabel } from "./labels";

export function prazoParaEvento(p: PrazoAgendaView): CalEvento | null {
  if (!p.end_date || !p.intimation_id) return null;
  return {
    id: `prazo-${p.id}`,
    tipo: "prazo",
    titulo: tipoAtoLabel(p.tipo_ato),
    sub: [formatarCNJ(p.cnj_number || ""), p.court].filter(Boolean).join(" · "),
    situacao:
      p.status === "PENDING"
        ? "Pendente"
        : prazoStatusLabel(p.status, p.days_left),
    contagem: p.days
      ? `${p.days} ${p.counting === "BUSINESS" ? "dias úteis" : "dias corridos"}${p.doubled ? " · em dobro" : ""}`
      : undefined,
    dia: p.end_date.slice(0, 10),
    dias: p.days_left,
    href: `/intimacoes/${p.intimation_id}`,
  };
}

export function providenciaParaEvento(
  p: ActionItemView,
  hoje: string,
  responsavel?: string | null,
): CalEvento | null {
  const date = p.effective_due_date || p.due_date;
  if (!date) return null;
  const dia = date.slice(0, 10);
  return {
    id: `prov-${p.id}`,
    tipo: "providencia",
    titulo: p.title,
    sub: [formatarCNJ(p.cnj_number || ""), p.court].filter(Boolean).join(" · "),
    processo: p.process_title,
    situacao: STATUS_LABEL[p.status],
    responsavel:
      responsavel ||
      (p.assignee_user_id ? "Responsável atribuído" : "Sem responsável"),
    dia,
    dias: diasRestantes(dia, hoje),
    href: `/providencias/${p.id}`,
  };
}
