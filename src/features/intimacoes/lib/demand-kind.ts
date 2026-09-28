// Rótulos pt-BR do demand_kind do brief (intimation_brief.demand_kind — R4.1) — a
// intenção da demanda extraída do teor. Fonte única (Regra nº1): nada de rótulo
// hard-coded no JSX. TRANSCRITO VERBATIM do BE — internal/advisory/prompt_render.go
// (mapa briefDemandLabels), pinado lá por TestBriefDemandLabels_CoverEnum (20
// valores, migrations/0182_intimation_brief.up.sql). Não editar sem conferir a
// fonte do BE primeiro.

import type { BriefDemandTargetRole, IntimacaoDemandKind } from "../types";

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

/** Rótulo pt-BR de `demand_target_role` (intimation_brief.demand_target_role —
 *  migration 0182) — QUEM deve agir, o eixo que o `demand_kind` (o QUE fazer)
 *  não cobre. Eixo DIFERENTE do `client_role` do processo (de que lado o
 *  escritório está — `processos/lib/apresentacao.ts`): um é a parte onerada
 *  pela intimação, o outro é a posição do escritório na causa; por isso os
 *  rótulos são frases ("Cabe ao réu"), não substantivos ("Réu(é)").
 *
 *  "UNKNOWN" não tem entrada de propósito (mesmo padrão do CLIENT_ROLE_LABEL):
 *  o único consumidor desvia antes de indexar o mapa — "papel não identificado"
 *  não é informação, é ausência, e a UI simplesmente não mostra o selo. */
export const DEMAND_TARGET_ROLE_LABEL: Record<
  Exclude<BriefDemandTargetRole, "UNKNOWN">,
  string
> = {
  PLAINTIFF: "Cabe ao autor",
  DEFENDANT: "Cabe ao réu",
  BOTH: "Cabe a ambas as partes",
  COUNSEL: "Cabe ao advogado",
};

/** Selo pt-BR de quem deve agir; "" quando ausente ou não identificado
 *  (UNKNOWN) — o chamador não renderiza o selo nesse caso. */
export function demandTargetRoleLabel(
  role: BriefDemandTargetRole | null,
): string {
  if (!role || role === "UNKNOWN") return "";
  return DEMAND_TARGET_ROLE_LABEL[role];
}
