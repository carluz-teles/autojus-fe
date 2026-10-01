"use client";
import type { DatasetRelease } from "../services/dataset-releases";
import { useEvaluationActions } from "./_private/use-evaluation-actions";
import { useEvaluationEditor } from "./_private/use-evaluation-editor";
import {
  useEvaluationLists,
  useEvaluationQueries,
} from "./_private/use-evaluation-queries";
import { useBackofficeContext } from "./use-backoffice-context";

export function useEvaluationAccess() {
  const { capabilities } = useBackofficeContext();
  return (
    capabilities.includes("curation.publish") &&
    capabilities.includes("curation.predict")
  );
}
export function useEvaluationWorkspace(id: string) {
  const allowed = useEvaluationAccess();
  return { allowed, ...useEvaluationLists(id, allowed) };
}
export function useEvaluationPreparation(
  release: DatasetRelease,
  unavailable: boolean,
) {
  return useEvaluationEditor(release, useEvaluationAccess(), unavailable);
}
export function useEvaluationDetail(id: string) {
  const allowed = useEvaluationAccess();
  const queries = useEvaluationQueries(id, allowed);
  return { allowed, ...queries, ...useEvaluationActions(queries, allowed) };
}
