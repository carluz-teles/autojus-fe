// Rótulos pt-BR do demand_kind do brief (intimation_brief.demand_kind — R4.1) — a
// intenção da demanda extraída do teor. Fonte única (Regra nº1): nada de rótulo
// hard-coded no JSX. TRANSCRITO VERBATIM do BE — internal/advisory/prompt_render.go
// (mapa briefDemandLabels), pinado lá por TestBriefDemandLabels_CoverEnum (20
// valores, migrations/0182_intimation_brief.up.sql). Não editar sem conferir a
// fonte do BE primeiro.

import type { IntimacaoDemandKind } from "../types";

/** Rótulo pt-BR de cada demand_kind. Chaves = intimation_brief.demand_kind. */
export const DEMAND_KIND_LABEL: Record<IntimacaoDemandKind, string> = {
  // Peças com regime legal próprio.
  answer: "resposta/contestação",
  reply: "réplica",
  appeal: "recurso de apelação",
  interlocutory_appeal: "agravo de instrumento",
  clarification_motion: "embargos de declaração",
  small_claims_appeal: "recurso inominado",
  counter_arguments: "contrarrazões",
  execution_objection: "embargos à execução",
  enforcement_challenge: "impugnação ao cumprimento de sentença",
  manifest: "manifestação",
  // Diligências.
  provide_address: "informar endereço",
  provide_document: "juntar documento",
  provide_calculation: "apresentar cálculos",
  pay: "efetuar pagamento",
  comply: "cumprimento de decisão",
  attend_hearing: "comparecer à audiência",
  appoint_counsel: "constituir advogado",
  // Estados.
  acknowledge: "ciência",
  none: "nenhuma providência",
  undetermined: "indeterminado",
};

/**
 * Rótulo pt-BR do demand_kind para exibição (chip da Triagem, "O que aconteceu"
 * do detalhe): mapa conhecido, senão o próprio valor cru (mesmo fallback
 * future-proof do BE — briefDemandLabel). "" (sem brief ainda) devolve "".
 */
export function demandKindLabel(kind: IntimacaoDemandKind | ""): string {
  if (!kind) return "";
  return DEMAND_KIND_LABEL[kind] ?? kind;
}
