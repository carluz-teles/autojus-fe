"use client";

import type { ChangeEvent, MouseEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { AnnotationEditorInput } from "../../services/annotation-assignments";
import {
  annotationActTypeLabel,
  type AnnotationFormValues,
  changeAnnotationDeadline,
  deadlineFromCue,
  emptyAnnotationDeadline,
} from "../../services/annotation-form";
import type { AnnotationEvidence } from "../../services/annotation-schema";

export function useAnnotationActFields(
  index: number,
  input: AnnotationEditorInput,
  selection: AnnotationEvidence | null,
) {
  const form = useFormContext<AnnotationFormValues>();
  const act = useWatch({ control: form.control, name: `label.acts.${index}` });
  const options = input.protocol.contract.act_types.map((value) => ({
    value,
    label: annotationActTypeLabel(value, input.protocol.act_type_labels),
  }));
  const rules = Object.entries(input.protocol.rule_sources).map(
    ([value, source]) => ({ value, label: source.citation }),
  );
  const rule = act.deadline.legal_rule_ref
    ? input.protocol.rule_sources[act.deadline.legal_rule_ref]
    : undefined;
  const suggestion =
    input.assignment?.mode === "assisted"
      ? input.prediction?.suggestion
      : undefined;
  function changeKind(event: ChangeEvent<HTMLSelectElement>) {
    form.setValue(
      `label.acts.${index}.deadline`,
      changeAnnotationDeadline(act.deadline, event.currentTarget.value),
      { shouldDirty: true },
    );
  }
  function changeRule(event: ChangeEvent<HTMLSelectElement>) {
    const key = event.currentTarget.value,
      rule = input.protocol.contract.legal_rules[key];
    const deadline = {
      ...emptyAnnotationDeadline("legal_rule"),
      condition: act.deadline.condition,
      reason: act.deadline.reason,
      legal_rule_ref: key || null,
      quantity: rule?.quantity ?? null,
      unit: rule?.unit ?? null,
      anchor_event: rule?.anchor_event ?? null,
      start_rule: rule?.start_rule ?? null,
    };
    form.setValue(`label.acts.${index}.deadline`, deadline, {
      shouldDirty: true,
    });
  }
  function applyActEvidence() {
    if (selection)
      form.setValue(`label.acts.${index}.evidence`, selection, {
        shouldDirty: true,
      });
  }
  function applyDeadlineEvidence() {
    if (selection)
      form.setValue(`label.acts.${index}.deadline.evidence`, selection, {
        shouldDirty: true,
      });
  }
  function applySuggestedType() {
    if (
      suggestion?.type_in_catalog &&
      input.protocol.contract.act_types.includes(suggestion.act_type)
    )
      form.setValue(`label.acts.${index}.act_type`, suggestion.act_type, {
        shouldDirty: true,
      });
  }
  function applySuggestedDeadline(event: MouseEvent<HTMLButtonElement>) {
    const cue =
      suggestion?.deadline_cues[Number(event.currentTarget.dataset.cue)];
    if (cue?.exact_source_span)
      form.setValue(`label.acts.${index}.deadline`, deadlineFromCue(cue), {
        shouldDirty: true,
      });
  }
  return {
    form,
    act,
    options,
    rules,
    rule,
    suggestion,
    changeKind,
    changeRule,
    applyActEvidence,
    applyDeadlineEvidence,
    applySuggestedType,
    applySuggestedDeadline,
    errors: form.formState.errors.label?.acts?.[index],
  };
}
