"use client";

import type {
  AnnotationAssignmentDetail,
  AnnotationAssignmentInput,
  AnnotationDraft,
  AnnotationEditorInput,
} from "../services/annotation-assignments";
import type { AnnotationEvidence } from "../services/annotation-schema";
import { useAnnotationActFields } from "./_private/use-annotation-act";
import { useAnnotationDetail } from "./_private/use-annotation-detail";
import { useAnnotationEditor } from "./_private/use-annotation-editor";
import { useAnnotationQueueState } from "./_private/use-annotation-queue";
import {
  useAnnotationAnswerState,
  useAnnotationResumeState,
  usePreviousAnnotationDraft,
} from "./_private/use-annotation-recovery";
import { useBackofficeContext } from "./use-backoffice-context";

export function useAnnotationWorkspace(batch?: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.annotate");
  return { allowed, ...useAnnotationQueueState(allowed, batch) };
}
export function useAnnotationPage(id: string, recoverFrom?: string) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.annotate");
  const state = useAnnotationDetail(id, allowed);
  const previous = usePreviousAnnotationDraft(
    recoverFrom,
    state.detail.data,
    allowed,
  );
  const input =
    state.input.data && state.detail.data
      ? { ...state.input.data, assignment: state.detail.data.assignment }
      : state.input.data;
  return { allowed, ...state, previous, currentInput: input };
}
export function useAnnotationForm(
  input: AnnotationAssignmentInput,
  writable: boolean,
  previousDraft?: AnnotationDraft,
) {
  return useAnnotationEditor(input, writable, previousDraft);
}
export function useAnnotationAct(
  index: number,
  input: AnnotationEditorInput,
  selection: AnnotationEvidence | null,
) {
  return useAnnotationActFields(index, input, selection);
}
export function useAnnotationResume(detail: AnnotationAssignmentDetail) {
  return useAnnotationResumeState(detail);
}
export function useAnnotationAnswer(raw: unknown) {
  return useAnnotationAnswerState(raw);
}
