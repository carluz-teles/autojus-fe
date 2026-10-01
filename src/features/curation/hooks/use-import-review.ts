"use client";

import { useImportReviewContext } from "./_private/use-import-review-context";
import { useBackofficeContext } from "./use-backoffice-context";

export function useImportReview(batchId: string, itemId: string) {
  const session = useBackofficeContext();
  const allowed = session.capabilities.includes("curation.admit");
  return { allowed, ...useImportReviewContext(batchId, itemId, allowed) };
}
