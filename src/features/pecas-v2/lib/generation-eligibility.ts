import type { ActionItemView } from "@/features/action-items/types";

/** Existing drafts can reopen after closure; new drafts need a live formal item. */
export function generationBlockReason(
  item: ActionItemView,
  expectedIntimationId?: string,
): string | null {
  if (
    expectedIntimationId &&
    item.intimation_id &&
    item.intimation_id !== expectedIntimationId
  )
    return "A providência não pertence a esta intimação. Volte à intimação de origem.";
  if (item.draft_id) return null;
  if (!item.intimation_id)
    return "Esta providência não tem intimação de origem. Abra a intimação para continuar.";
  if (item.origin_review_required)
    return "A origem desta providência precisa ser revisada na intimação antes de gerar a peça.";
  if (!item.gera_peca)
    return "Esta providência não gera peça. Volte à intimação para revisar o trabalho.";
  if (["DONE", "CANCELLED", "DISMISSED"].includes(item.status))
    return "Esta providência foi encerrada sem peça. Volte à intimação para revisar o trabalho.";
  if (!["SUGGESTED", "TODO", "WORKING"].includes(item.status))
    return "O estado desta providência mudou. Volte à intimação para revisar o trabalho.";
  return null;
}
