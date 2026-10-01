"use client";

import type { UseFormReturn } from "react-hook-form";

import type { AdmissionForm } from "../../services/import-admission";
import type { useSanitizationEditor } from "./use-sanitization-editor";

export function useSanitizationActions(
  editor: ReturnType<typeof useSanitizationEditor>,
  form: UseFormReturn<AdmissionForm>,
) {
  function resetAcknowledgement() {
    form.setValue("privacy_reviewed", false, { shouldDirty: true });
    form.setValue("meaning_status", "uncertain", { shouldDirty: true });
  }
  function add() {
    if (editor.add()) resetAcknowledgement();
  }
  function undo() {
    if (!editor.redactions.length) return;
    editor.undo();
    resetAcknowledgement();
  }
  return { add, undo };
}
