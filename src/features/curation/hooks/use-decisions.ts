"use client";

import type { DecisionPreview } from "../services/annotation-decisions";
import { useDecisionEditor } from "./_private/use-decision-editor";
import {
  useDecisionInputState,
  useDecisionQueueState,
  useDecisionReceiptState,
} from "./_private/use-decision-queries";
import { useBackofficeContext } from "./use-backoffice-context";

export function useDecisionWorkspace() {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.decide");
  return { allowed, ...useDecisionQueueState(allowed) };
}
export function useDecisionPage(task: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.decide");
  return { allowed, ...useDecisionInputState(task, allowed) };
}
export function useDecisionForm(
  input: DecisionPreview,
  refreshing: boolean,
  refresh: () => Promise<unknown> | undefined,
) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.decide");
  return useDecisionEditor(input, allowed, refreshing, refresh);
}
export function useDecisionReceipt(id: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.decide");
  return { allowed, ...useDecisionReceiptState(id, allowed) };
}
