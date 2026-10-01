"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type MouseEvent, type SyntheticEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  criticalAlertSchema,
  decisionCommand,
  decisionFormSchema,
  type DecisionFormValues,
  decisionInputVersion,
  type DecisionPreview,
} from "../../services/annotation-decisions";
import {
  annotationDefaults,
  annotationDraftSchema,
  type AnnotationFormValues,
} from "../../services/annotation-form";
import { importContextEntries } from "../../services/import-context";
import { useAnnotationFields } from "./use-annotation-fields";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useDecisionCommands } from "./use-decision-commands";

export function useDecisionEditor(
  input: DecisionPreview,
  allowed: boolean,
  refreshing: boolean,
  refresh: () => Promise<unknown> | undefined,
) {
  const [baseline, setBaseline] = useState(() => decisionInputVersion(input));
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [refreshed, setRefreshed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [initial] = useState(() => annotationDefaults(input));
  const form = useForm<AnnotationFormValues>({
    resolver: zodResolver(annotationDraftSchema),
    defaultValues: initial,
  });
  const meta = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: { outcome: "", selected: "", reason: "" },
  });
  const alert = useForm<z.infer<typeof criticalAlertSchema>>({
    resolver: zodResolver(criticalAlertSchema),
    defaultValues: { reason: "" },
  });
  const values = useWatch({ control: form.control });
  const metaValues = useWatch({ control: meta.control });
  const alertValues = useWatch({ control: alert.control });
  const fields = useAnnotationFields(
    form,
    input.snapshot.facts.text,
    setMessage,
  );
  const commands = useDecisionCommands(input.task_id);
  const result = commands.mutation.data;
  const receipt = result?.action === "decision" ? result.receipt : undefined;
  const stale = baseline !== decisionInputVersion(input) || needsRefresh;
  const locked =
    !allowed ||
    refreshing ||
    !!receipt ||
    commands.mutation.isPending ||
    commands.uncertain;
  const dirty =
    !receipt &&
    (JSON.stringify(values) !== JSON.stringify(initial) ||
      !!metaValues.reason ||
      !!metaValues.outcome ||
      !!alertValues.reason);
  const navigation = useAnnotationNavigation(
    dirty || commands.uncertain || commands.mutation.isPending,
  );
  function report(error: unknown) {
    setMessage(
      error instanceof z.ZodError
        ? error.issues.map((i) => i.message).join(" · ")
        : error instanceof Error
          ? error.message
          : "Confira os campos.",
    );
  }
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || stale || commands.isBusy()) return;
    try {
      const body = decisionCommand(
        input,
        meta.getValues(),
        form.getValues(),
        crypto.randomUUID(),
      );
      setMessage(null);
      try {
        await commands.run({ action: "decision", body });
      } catch {
        setNeedsRefresh(true);
        setRefreshed(false);
      }
    } catch (error) {
      report(error);
    }
  }
  async function addAlert(event?: SyntheticEvent) {
    event?.preventDefault();
    if (locked || commands.isBusy()) return;
    try {
      const body = {
        ...criticalAlertSchema.parse(alert.getValues()),
        request_id: crypto.randomUUID(),
      };
      setMessage(null);
      const saved = await commands.run({ action: "alert", body });
      if (saved) {
        alert.reset();
        setNeedsRefresh(true);
        setRefreshed(false);
        setMessage(
          "Alerta registrado. Atualize e confira a comparação antes de decidir.",
        );
      }
    } catch (error) {
      report(error);
    }
  }
  async function recover() {
    if (!allowed || commands.isBusy()) return;
    try {
      const saved = await commands.recover();
      if (saved?.action === "alert") {
        alert.reset();
        setNeedsRefresh(true);
        setRefreshed(false);
        setMessage("Alerta recuperado. Atualize a comparação.");
      }
    } catch {
      /* Keep exact request pending; the mutation presents its failure. */
    }
  }
  function copyReview(event: MouseEvent<HTMLButtonElement>) {
    if (locked) return;
    const review = input.reviews.find(
      (r) => r.submission_id === event.currentTarget.dataset.submission,
    );
    if (review) {
      form.reset(structuredClone(review.annotation), {
        keepDefaultValues: true,
      });
      meta.setValue(
        "outcome",
        review.annotation.label.answerability === "insufficient"
          ? "insufficient"
          : "corrected",
        { shouldDirty: true },
      );
      setMessage(
        "Resposta copiada para correção. Confira cada dimensão antes de decidir.",
      );
    }
  }
  async function refreshComparison() {
    if (locked || commands.isBusy()) return;
    const response = await refresh();
    // React Query resolves failed refetches with isError; it does not always throw.
    setRefreshed(
      !!response &&
        typeof response === "object" &&
        "isSuccess" in response &&
        response.isSuccess === true,
    );
  }
  function acknowledgeComparison() {
    if (locked || (needsRefresh && !refreshed)) return;
    setBaseline(decisionInputVersion(input));
    setNeedsRefresh(false);
    setRefreshed(false);
    setMessage("Comparação atual confirmada. Suas edições foram mantidas.");
  }
  return {
    context: importContextEntries(input.snapshot.facts.context),
    form,
    meta,
    alert,
    ...fields,
    commands,
    receipt,
    stale,
    needsRefresh,
    refreshed,
    locked,
    dirty,
    navigation,
    message,
    submit,
    addAlert,
    recover,
    copyReview,
    refreshComparison,
    acknowledgeComparison,
    outcome: metaValues.outcome,
    canDecide: !locked && !stale && input.assessment.ready,
  };
}
