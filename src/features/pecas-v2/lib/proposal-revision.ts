import type { PendingChange } from "../types";

export function isProposalStale(
  proposal: Pick<PendingChange, "baseRevision">,
  contentRevision: string,
): boolean {
  return (
    !proposal.baseRevision ||
    !contentRevision ||
    proposal.baseRevision !== contentRevision
  );
}
