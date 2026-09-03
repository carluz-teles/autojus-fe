// Rótulos de prazo do card de Triagem — derivados do MESMO
// prazoUrgenciaInfo/legendaDiasRestantes que já alimentam a cor/legenda em
// toda a tela de Intimações (Regra nº1: não recalcular/reescrever a lógica de
// urgência aqui, só formatar o texto específico deste card).

import {
  legendaDiasRestantes,
  prazoUrgenciaInfo,
} from "@/features/intimacoes/components/shared/prazo-urgencia";
import type { IntimacaoPrazoView } from "@/features/intimacoes/types";

/** Texto curto e colorido do card ("vence hoje" · "3 dias restantes" · "2 dias
 *  em atraso" · "sem prazo"). */
export function prazoRelativoLabel(prazo: IntimacaoPrazoView | null): string {
  const info = prazoUrgenciaInfo(prazo);
  if (!info) return "sem prazo";
  const legenda = legendaDiasRestantes(info);
  if (info.hoje) return legenda;
  return `${info.magnitude} ${legenda}`;
}

/** Nome acessível do prazo — usado no aria-label do card (o indicador de
 *  urgência nunca pode depender só da cor: este texto é o par obrigatório). */
export function prazoAcessivelLabel(prazo: IntimacaoPrazoView | null): string {
  const info = prazoUrgenciaInfo(prazo);
  if (!info) return "sem prazo definido";
  if (info.atrasado) {
    return `${info.magnitude} ${info.magnitude === 1 ? "dia" : "dias"} em atraso`;
  }
  if (info.hoje) return "vence hoje";
  return `vence em ${info.magnitude} ${info.magnitude === 1 ? "dia" : "dias"}`;
}
