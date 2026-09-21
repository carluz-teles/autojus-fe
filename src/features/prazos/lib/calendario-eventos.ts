import type { PrazoAgendaView } from "../types";
import type { CalEvento } from "./calendario";
import { formatarCNJ } from "./detalhe-apresentacao";
import { prazoStatusLabel, tipoAtoLabel } from "./labels";

// O calendário é agenda de PRAZOS das intimações (a intimação move o prazo). O
// mapeador de action_item→evento saiu junto com o conceito de providência.
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
