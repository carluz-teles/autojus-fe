"use client";

import { type ChangeEvent, type SyntheticEvent, useState } from "react";

import {
  type AnnotationEvidence,
  evidenceFromSelection,
} from "../../services/annotation-schema";
import {
  type ImportRedaction,
  redactionCategories,
  redactionFields,
  redactionPreview,
} from "../../services/import-admission";
import type { ImportItem } from "../../services/imports";

export function useSanitizationEditor(item: ImportItem) {
  const fields = redactionFields(item);
  const [fieldKey, setFieldKey] = useState("text"),
    [category, setCategory] = useState("person");
  const [selection, setSelection] = useState<AnnotationEvidence | null>(null);
  const [redactions, setRedactions] = useState<ImportRedaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const field = fields.find((entry) => entry.key === fieldKey) ?? fields[0];
  function changeField(event: ChangeEvent<HTMLSelectElement>) {
    setFieldKey(event.target.value);
    setSelection(null);
    setError(null);
  }
  function changeCategory(event: ChangeEvent<HTMLSelectElement>) {
    setCategory(event.target.value);
  }
  function selectText(event: SyntheticEvent<HTMLTextAreaElement>) {
    const control = event.currentTarget;
    try {
      setSelection(
        evidenceFromSelection(
          field.text,
          control.selectionStart,
          control.selectionEnd,
        ),
      );
    } catch {
      setSelection(null);
    }
  }
  function add() {
    const kind = redactionCategories.find((entry) => entry.value === category);
    if (!selection || !kind) return false;
    if (redactions.length >= 256) {
      setError("Limite de 256 transformações atingido.");
      return false;
    }
    const replacement = `[${kind.prefix}_${redactions.length + 1}]`;
    const next = [
      ...redactions,
      { field: field.key, category, evidence: selection, replacement },
    ];
    try {
      redactionPreview(field.text, field.key, next);
      setRedactions(next);
      setError(null);
      setSelection(null);
      return true;
    } catch {
      setError(
        "A seleção se sobrepõe a outra transformação. Desfaça a anterior ou selecione outro trecho.",
      );
      return false;
    }
  }
  function undo() {
    setRedactions((previous) => previous.slice(0, -1));
    setError(null);
  }
  return {
    fields,
    field,
    fieldKey,
    category,
    selection,
    redactions,
    error,
    changeField,
    changeCategory,
    selectText,
    add,
    undo,
    preview: fields.map((entry) => ({
      ...entry,
      text: redactionPreview(entry.text, entry.key, redactions),
    })),
  };
}
