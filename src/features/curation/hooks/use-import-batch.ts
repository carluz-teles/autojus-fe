"use client";

import { useImportDetail } from "./_private/use-import-detail";
import { useBackofficeContext } from "./use-backoffice-context";

export function useImportBatch(id: string) {
  const session = useBackofficeContext();
  const allowed = session.capabilities.includes("curation.admit");
  return { allowed, ...useImportDetail(id, allowed) };
}
