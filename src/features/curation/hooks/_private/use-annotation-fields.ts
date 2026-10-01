"use client";

import {
  type ChangeEvent,
  type MouseEvent,
  type SyntheticEvent,
  useState,
} from "react";
import {
  useController,
  useFieldArray,
  type UseFormReturn,
} from "react-hook-form";

import {
  type AnnotationFormValues,
  emptyAnnotationAct,
} from "../../services/annotation-form";
import {
  type AnnotationEvidence,
  evidenceFromSelection,
} from "../../services/annotation-schema";

export function useAnnotationFields(
  form: UseFormReturn<AnnotationFormValues>,
  text: string,
  report: (message: string | null) => void,
) {
  const fields = useFieldArray({ control: form.control, name: "label.acts" });
  const { field } = useController({
    control: form.control,
    name: "label.missing_context",
  });
  const [selection, setSelection] = useState<AnnotationEvidence | null>(null);
  function selectEvidence(event: SyntheticEvent<HTMLTextAreaElement>) {
    const node = event.currentTarget;
    if (node.selectionEnd <= node.selectionStart) return;
    try {
      setSelection(
        evidenceFromSelection(text, node.selectionStart, node.selectionEnd),
      );
      report(null);
    } catch (error) {
      report(
        error instanceof Error
          ? error.message
          : "Selecione um trecho completo.",
      );
    }
  }
  function addAct() {
    if (fields.fields.length < 32) fields.append(emptyAnnotationAct());
  }
  function removeAct(event: MouseEvent<HTMLButtonElement>) {
    fields.remove(Number(event.currentTarget.dataset.index));
  }
  function changeMissingContext(event: ChangeEvent<HTMLTextAreaElement>) {
    field.onChange(event.currentTarget.value.split("\n"));
  }
  return {
    fields: fields.fields,
    selection,
    selectEvidence,
    addAct,
    removeAct,
    missingContext: {
      name: field.name,
      onBlur: field.onBlur,
      value: field.value?.join("\n") ?? "",
      onChange: changeMissingContext,
    },
  };
}
