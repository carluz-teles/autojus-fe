"use client";

import { useImportForm } from "./_private/use-import-form";
import { useImportList } from "./_private/use-import-list";
import { useBackofficeContext } from "./use-backoffice-context";

export function useImportWorkspace() {
  const session = useBackofficeContext();
  const allowed = session.capabilities.includes("curation.admit");
  const form = useImportForm(),
    list = useImportList(allowed);
  return { allowed, ...form, list };
}
