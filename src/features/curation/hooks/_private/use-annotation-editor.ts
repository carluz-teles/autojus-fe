"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import { type Path, useForm, useWatch } from "react-hook-form";

import type {
  AnnotationAssignmentInput,
  AnnotationCommand,
  AnnotationCommandResult,
  AnnotationDraft,
} from "../../services/annotation-assignments";
import {
  annotationActTypeLabel,
  annotationDefaults,
  annotationDraftSchema,
  type AnnotationFormValues,
  annotationForSubmission,
  annotationLeaseLabel,
  annotationValidationMessages,
  restoreAnnotationDraft,
} from "../../services/annotation-form";
import { importContextEntries } from "../../services/import-context";
import { useAnnotationCommands } from "./use-annotation-commands";
import { useAnnotationFields } from "./use-annotation-fields";
import { useAnnotationNavigation } from "./use-annotation-navigation";

export function useAnnotationEditor(
  input: AnnotationAssignmentInput,
  writable: boolean,
  previousDraft?: AnnotationDraft,
) {
  const [initial] = useState(() => {
    try {
      return { values: annotationDefaults(input), error: null };
    } catch (error) {
      return {
        values: null,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível recuperar o rascunho.",
      };
    }
  });
  const form = useForm<AnnotationFormValues>({
    resolver: zodResolver(annotationDraftSchema),
    defaultValues: initial.values ?? undefined,
  });
  const values = useWatch({ control: form.control });
  const [baseline, setBaseline] = useState({
    revision: input.draft.revision,
    fingerprint: JSON.stringify(initial.values),
  });
  const [showConflict, setShowConflict] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const answerFields = useAnnotationFields(
    form,
    input.snapshot.facts.text,
    setMessage,
  );
  const [tick, setTick] = useState(Date.now);
  const [autosaveStopped, setAutosaveStopped] = useState(false);
  const currentFingerprint = JSON.stringify(values);
  const dirty =
    initial.values !== null && currentFingerprint !== baseline.fingerprint;
  const remoteConflict = input.draft.revision > baseline.revision;
  const expired = Date.parse(input.assignment.lease_until) <= tick;
  function acknowledged(
    command: AnnotationCommand,
    receipt: AnnotationCommandResult,
  ) {
    if (command.action === "draft" && receipt.draft) {
      const fingerprint = JSON.stringify(command.body.annotation);
      setBaseline({ revision: receipt.draft.revision, fingerprint });
      if (JSON.stringify(form.getValues()) === fingerprint)
        form.reset(command.body.annotation as AnnotationFormValues);
    }
    if (command.action === "submissions") {
      setBaseline({
        revision: command.body.expected_draft_revision,
        fingerprint: JSON.stringify(command.body.annotation),
      });
      form.reset(command.body.annotation as AnnotationFormValues);
    }
    setAutosaveStopped(false);
    setMessage(
      command.action === "draft"
        ? "Rascunho salvo."
        : command.action === "submissions"
          ? "Resposta submetida. A revisão jurídica é uma etapa separada."
          : command.action === "renewals"
            ? "Reserva renovada."
            : "Reserva devolvida à fila.",
    );
  }
  const commands = useAnnotationCommands(input.assignment.id, acknowledged);
  const canWrite =
    writable &&
    !expired &&
    !initial.error &&
    !commands.uncertain &&
    !remoteConflict;
  const editable = !!initial.values && input.assignment.state === "active";
  useEffect(() => {
    if (input.assignment.state !== "active") return;
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [input.assignment.state]);
  async function persist(action: "draft" | "submissions") {
    if (!canWrite || commands.isBusy()) return;
    const candidate =
      action === "draft"
        ? annotationDraftSchema.safeParse(form.getValues())
        : annotationForSubmission(form.getValues(), input);
    if (!candidate.success) {
      form.clearErrors();
      candidate.error.issues.forEach((issue) =>
        form.setError(issue.path.join(".") as Path<AnnotationFormValues>, {
          message: issue.message,
        }),
      );
      setMessage("Confira os campos indicados antes de submeter.");
      return;
    }
    form.clearErrors();
    setMessage(null);
    try {
      return await commands.run({
        action,
        body: {
          request_id: crypto.randomUUID(),
          expected_revision: input.assignment.revision,
          expected_draft_revision: baseline.revision,
          annotation: candidate.data,
        },
      });
    } catch {
      setAutosaveStopped(true);
    }
  }
  async function save() {
    setAutosaveStopped(false);
    return persist("draft");
  }
  async function submit(event?: SyntheticEvent) {
    event?.preventDefault();
    return persist("submissions");
  }
  async function renew() {
    if (!writable || expired || commands.isBusy() || commands.uncertain) return;
    try {
      await commands.run({
        action: "renewals",
        body: {
          request_id: crypto.randomUUID(),
          expected_revision: input.assignment.revision,
        },
      });
    } catch {
      setAutosaveStopped(true);
    }
  }
  async function release() {
    if (dirty || commands.isBusy() || commands.uncertain || expired) return;
    try {
      await commands.run({
        action: "releases",
        body: {
          request_id: crypto.randomUUID(),
          expected_revision: input.assignment.revision,
        },
      });
    } catch {
      setAutosaveStopped(true);
    }
  }
  async function recover() {
    try {
      await commands.recover();
    } catch {
      setAutosaveStopped(true);
    }
  }
  function copyPreviousDraft() {
    if (
      !previousDraft?.annotation ||
      !initial.values ||
      commands.isBusy() ||
      commands.uncertain
    )
      return;
    try {
      const restored = restoreAnnotationDraft(
        previousDraft.annotation,
        initial.values,
      );
      form.reset(restored, { keepDefaultValues: true });
      setAutosaveStopped(true);
      setMessage(
        "Seu rascunho anterior foi copiado para o formulário. Confira as respostas e salve quando estiver pronto.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "O rascunho anterior não corresponde à tarefa.",
      );
    }
  }
  function compare() {
    setShowConflict(true);
  }
  function useRemoteDraft() {
    try {
      const restored = annotationDefaults(input);
      setBaseline({
        revision: input.draft.revision,
        fingerprint: JSON.stringify(restored),
      });
      form.reset(restored);
      setShowConflict(false);
      setAutosaveStopped(false);
      setMessage("Versão salva carregada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Rascunho incompatível.",
      );
    }
  }
  function keepLocalDraft() {
    setBaseline((previous) => ({
      ...previous,
      revision: input.draft.revision,
    }));
    setShowConflict(false);
    setAutosaveStopped(true);
    setMessage(
      "Sua edição foi preservada. Use Salvar rascunho para substituir a revisão comparada.",
    );
  }
  // No retry loop: any failed autosave pauses until explicit recovery/save.
  // An in-flight older save never resets newer local edits.
  const persistLatest = useRef(persist);
  useEffect(() => {
    persistLatest.current = persist;
  });
  useEffect(() => {
    if (!dirty || !canWrite || commands.mutation.isPending || autosaveStopped)
      return;
    const timer = setTimeout(() => {
      void persistLatest.current("draft");
    }, 1200);
    return () => clearTimeout(timer);
  }, [
    dirty,
    canWrite,
    commands.mutation.isPending,
    autosaveStopped,
    currentFingerprint,
  ]);
  const navigation = useAnnotationNavigation(
    dirty || commands.uncertain || commands.mutation.isPending,
  );
  return {
    form,
    ...answerFields,
    values,
    copyPreviousDraft,
    save,
    submit,
    renew,
    release,
    recover,
    commands,
    initialError: initial.error,
    canWrite,
    editable,
    expired,
    dirty,
    remoteConflict,
    showConflict,
    compare,
    useRemoteDraft,
    keepLocalDraft,
    message,
    navigation,
    validationMessages: annotationValidationMessages(form.formState.errors),
    context: importContextEntries(input.snapshot.facts.context),
    leaseLabel: annotationLeaseLabel(input.assignment.lease_until),
    suggestionTypeLabel: annotationActTypeLabel(
      input.prediction?.suggestion.act_type ?? "",
      input.protocol.act_type_labels,
    ),
    submissionPending:
      commands.mutation.isPending &&
      commands.mutation.variables?.action === "submissions",
  };
}
