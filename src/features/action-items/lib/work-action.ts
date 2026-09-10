import type { ActionItemView } from "../types";

export type PrimaryWorkAction =
  | "review-origin"
  | "review-suggestion"
  | "open-piece"
  | "generate-piece"
  | "review-type"
  | "start-work"
  | "complete-work"
  | null;

const TERMINAL_STATUSES = new Set(["DONE", "CANCELLED", "DISMISSED"]);

/**
 * Resolve a ação principal sem misturar o ciclo da providência com o da peça.
 * Uma peça já criada continua acessível mesmo após a providência ser encerrada;
 * gerar uma nova peça, por outro lado, exige uma intimação de origem e tipo confirmado.
 */
export function primaryWorkAction(item: ActionItemView): PrimaryWorkAction {
  if (
    item.origin_review_required &&
    item.intimation_id &&
    !item.draft_id &&
    !TERMINAL_STATUSES.has(item.status)
  )
    return "review-origin";
  if (item.status === "SUGGESTED") return "review-suggestion";
  if (item.draft_id) return "open-piece";

  const terminal = TERMINAL_STATUSES.has(item.status);
  if (item.gera_peca && item.intimation_id && !terminal) {
    return item.tipo_status === "confiavel" ? "generate-piece" : "review-type";
  }
  if (item.status === "TODO") return "start-work";
  if (item.status === "WORKING") return "complete-work";
  return null;
}
