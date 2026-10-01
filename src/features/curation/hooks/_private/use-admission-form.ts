"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type BaseSyntheticEvent, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useApi } from "@/lib/api/use-api";

import { isUncertainCommandFailure } from "../../services/command-recovery";
import {
  admissionBody,
  type AdmissionForm,
  admissionFormSchema,
  admitImportedCase,
  type ImportPrivacyPolicy,
  type ImportRedaction,
} from "../../services/import-admission";
import type { ImportBatch, ImportItem } from "../../services/imports";

export function useAdmissionForm(
  batch: ImportBatch,
  item: ImportItem,
  policy: ImportPrivacyPolicy,
  redactions: ImportRedaction[],
) {
  const api = useApi(),
    client = useQueryClient();
  const form = useForm<AdmissionForm>({
    resolver: zodResolver(admissionFormSchema),
    defaultValues: {
      matter_key: "",
      legal_date: item.input.context.legal_date ?? "",
      knowledge_as_of: "",
      reviewed_at: "",
      dataset_key: "synthetic:",
      consent_receipt: "",
      consent_confirmed_at: "",
      review_receipt: "",
      privacy_reviewed: false,
      meaning_status: "uncertain",
      evaluation: false,
      training: false,
      rag: false,
      expected_batch_revision: batch.revision,
      privacy_policy_revision: policy.revision,
    },
  });
  const revision = useWatch({
    control: form.control,
    name: "expected_batch_revision",
  });
  const policyRevision = useWatch({
    control: form.control,
    name: "privacy_policy_revision",
  });
  const attempt = useRef<{ input: string; request: string } | null>(null);
  const mutation = useMutation({
    mutationFn: (body: ReturnType<typeof admissionBody>) =>
      admitImportedCase(api, body),
    retry: false,
    onSuccess: () => {
      void client.invalidateQueries({
        queryKey: ["curation", "import", batch.id],
      });
      void client.invalidateQueries({
        queryKey: ["curation", "import-review", batch.id, item.id],
      });
      void client.invalidateQueries({ queryKey: ["curation", "imports"] });
    },
  });
  async function persist(values: AdmissionForm) {
    try {
      const body = admissionBody("", item, values, redactions),
        input = JSON.stringify(body);
      if (
        mutation.isError &&
        isUncertainCommandFailure(mutation.error) &&
        attempt.current?.input !== input
      )
        throw new Error(
          "Confirme o resultado do envio anterior antes de enviar alterações.",
        );
      if (attempt.current?.input !== input)
        attempt.current = { input, request: crypto.randomUUID() };
      body.request_id = attempt.current.request;
      await mutation.mutateAsync(body);
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "A admissão falhou. A revisão foi preservada.",
      });
    }
  }
  function submit(event?: BaseSyntheticEvent) {
    return form.handleSubmit(persist)(event);
  }
  async function recover() {
    if (!mutation.variables || mutation.isPending) return;
    try {
      await mutation.mutateAsync(mutation.variables);
    } catch (error) {
      form.setError("root.serverError", {
        message:
          error instanceof Error
            ? error.message
            : "O resultado da admissão ainda não foi confirmado.",
      });
    }
  }
  function reconcile() {
    form.reset({
      ...form.getValues(),
      expected_batch_revision: batch.revision,
      privacy_policy_revision: policy.revision,
      privacy_reviewed: false,
      meaning_status: "uncertain",
    });
  }
  const outdated =
    revision !== batch.revision ||
    (item.input.origin === "real" && policyRevision !== policy.revision);
  const available =
    batch.state === "confirmed" &&
    item.state === "awaiting_privacy" &&
    item.input.source_kind === "manual_import" &&
    (item.input.origin === "synthetic" || policy.configured);
  return {
    form,
    submit,
    recover,
    uncertain: mutation.isError && isUncertainCommandFailure(mutation.error),
    reconcile,
    outdated,
    available,
    mutation,
    real: item.input.origin === "real",
  };
}
