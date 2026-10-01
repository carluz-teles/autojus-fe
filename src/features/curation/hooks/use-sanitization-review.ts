"use client";

import type { ImportPrivacyPolicy } from "../services/import-admission";
import type { ImportBatch, ImportItem } from "../services/imports";
import { useAdmissionForm } from "./_private/use-admission-form";
import { useSanitizationActions } from "./_private/use-sanitization-actions";
import { useSanitizationEditor } from "./_private/use-sanitization-editor";

export function useSanitizationReview(
  batch: ImportBatch,
  item: ImportItem,
  policy: ImportPrivacyPolicy,
) {
  const editor = useSanitizationEditor(item);
  const admission = useAdmissionForm(batch, item, policy, editor.redactions);
  const actions = useSanitizationActions(editor, admission.form);
  return { editor: { ...editor, ...actions }, admission };
}
