"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  type AnnotationAssignmentDetail,
  annotationKeys,
  claimAnnotation,
  getAnnotationAssignment,
  getAnnotationDraft,
} from "../../services/annotation-assignments";
import { annotationAnswerRows } from "../../services/annotation-form";
import { isUncertainCommandFailure } from "../../services/command-recovery";

export function usePreviousAnnotationDraft(
  sourceId: string | undefined,
  detail: AnnotationAssignmentDetail | undefined,
  allowed: boolean,
) {
  const api = useApi();
  const source = useQuery({
    queryKey: [...annotationKeys.all, "recovery-source", sourceId],
    queryFn: ({ signal }) => getAnnotationAssignment(api, sourceId!, signal),
    enabled: allowed && !!sourceId && !!detail,
    retry: false,
  });
  const matches =
    !!source.data &&
    !!detail &&
    source.data.assignment.task_id === detail.assignment.task_id;
  const draft = useQuery({
    queryKey: [...annotationKeys.all, "recovery-draft", sourceId],
    queryFn: ({ signal }) => getAnnotationDraft(api, sourceId!, signal),
    enabled: allowed && matches,
    retry: false,
  });
  return {
    draft: matches ? draft.data : undefined,
    error: source.error ?? draft.error,
    mismatched: !!source.data && !matches,
    loading: !!sourceId && (source.isPending || (matches && draft.isPending)),
  };
}
export function useAnnotationResumeState(detail: AnnotationAssignmentDetail) {
  const api = useApi(),
    busy = useRef(false);
  const mutation = useMutation({
    mutationFn: (body: { request_id: string; slot: number }) =>
      claimAnnotation(api, detail.assignment.task_id, body),
    retry: false,
    onSuccess: (receipt) =>
      window.location.assign(
        `/backoffice/curation/${receipt.assignment.id}?recover=${encodeURIComponent(detail.assignment.id)}`,
      ),
  });
  const uncertain =
    mutation.isError && isUncertainCommandFailure(mutation.error);
  async function resume() {
    if (
      busy.current ||
      !detail.assignment.valid ||
      !["expired", "released"].includes(detail.assignment.state)
    )
      return;
    busy.current = true;
    const body =
      uncertain && mutation.variables
        ? mutation.variables
        : { request_id: crypto.randomUUID(), slot: detail.assignment.slot };
    try {
      await mutation.mutateAsync(body);
    } catch {
      /* Keep the exact uncertain claim. */
    } finally {
      busy.current = false;
    }
  }
  return { mutation, uncertain, resume };
}
export function useAnnotationAnswerState(raw: unknown) {
  return useMemo(() => annotationAnswerRows(raw), [raw]);
}
