"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type ChangeEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import { goldError } from "../../services/annotation-gold";
import {
  evaluationKeys,
  issueEvaluationReport,
  type ReportEvaluationCommand,
  requestEvaluationRun,
  type RunEvaluationCommand,
} from "../../services/evaluations";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
import type { useEvaluationQueries } from "./use-evaluation-queries";

type Command =
  | { kind: "run"; command: RunEvaluationCommand }
  | { kind: "report"; command: ReportEvaluationCommand };
async function send(api: ApiFetcher, c: Command) {
  if (c.kind === "run")
    return {
      kind: "run" as const,
      receipt: await requestEvaluationRun(api, c.command),
    };
  return {
    kind: "report" as const,
    receipt: await issueEvaluationReport(api, c.command),
  };
}
const schema = z.strictObject({
  run_context: z.string(),
  report_context: z.string(),
});
export function useEvaluationActions(
  q: ReturnType<typeof useEvaluationQueries>,
  allowed: boolean,
) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { run_context: "", report_context: "" },
  });
  const values = useWatch({ control: form.control });
  const write = useCurationWrite(allowed, send, evaluationKeys.all);
  const [message, setMessage] = useState<string | null>(null);
  const p = q.plan.data,
    r = q.run.data,
    m = q.metadata.data;
  const runContext = `${p?.id}:${p?.definition_digest}:${p?.eligible}:${r?.id ?? "none"}`;
  const reportContext = `${r?.id}:${r?.definition_digest}:${m?.id ?? "new"}:${m?.eligible ?? "new"}`;
  const locked = !allowed || write.mutation.isPending || write.uncertain;
  const readsReady =
    q.plan.isSuccess &&
    q.run.isSuccess &&
    !q.plan.isFetching &&
    !q.run.isFetching;
  const canExecute =
    !locked &&
    readsReady &&
    !!p?.eligible &&
    p.execution_available &&
    r === null;
  // Dispatch eligibility depends on today's route; a historic report instead
  // uses its frozen route. Its separate endpoint reauthorizes data and actors.
  const canIssue =
    !locked &&
    readsReady &&
    !!r?.finished_at &&
    r.report_available !== false &&
    q.metadata.isSuccess &&
    !q.metadata.isFetching &&
    m?.eligible !== false;
  const receipt = write.mutation.data;
  const delivery =
    allowed &&
    readsReady &&
    q.metadata.isSuccess &&
    !q.metadata.isFetching &&
    m?.eligible === true &&
    receipt?.kind === "report" &&
    receipt.receipt.report.run_id === r?.id &&
    receipt.receipt.digest === m.digest
      ? receipt.receipt
      : undefined;
  function confirmRun(event: ChangeEvent<HTMLInputElement>) {
    form.setValue("run_context", event.target.checked ? runContext : "", {
      shouldDirty: true,
    });
  }
  function confirmReport(event: ChangeEvent<HTMLInputElement>) {
    form.setValue("report_context", event.target.checked ? reportContext : "", {
      shouldDirty: true,
    });
  }
  async function commit(command: Command) {
    setMessage(null);
    try {
      if (await write.run(command)) form.reset();
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function execute() {
    if (!canExecute || write.isBusy() || !p) return;
    if (form.getValues("run_context") !== runContext) {
      setMessage("Confirme o consumo desta execução e os limites congelados.");
      return;
    }
    await commit({
      kind: "run",
      command: {
        plan: p.id,
        body: {
          request_id: crypto.randomUUID(),
          expected_definition_digest: p.definition_digest,
          confirmed: true,
        },
      },
    });
  }
  async function issue() {
    if (!canIssue || write.isBusy() || !r || !p) return;
    if (form.getValues("report_context") !== reportContext) {
      setMessage(
        "Confirme a exposição aos resultados antes de abrir o relatório.",
      );
      return;
    }
    await commit({
      kind: "report",
      command: {
        run: r.id,
        plan: p.id,
        body: {
          request_id: crypto.randomUUID(),
          expected_definition_digest: r.definition_digest,
          confirmed_exposure: true,
        },
      },
    });
  }
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      if (await write.recover()) {
        form.reset();
        setMessage(null);
      }
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  const navigation = useAnnotationNavigation(
    write.uncertain || write.mutation.isPending || form.formState.isDirty,
  );
  return {
    form,
    write,
    message,
    runContext,
    reportContext,
    locked,
    canExecute,
    canIssue,
    delivery,
    runConfirmed: values.run_context === runContext,
    reportConfirmed: values.report_context === reportContext,
    confirmRun,
    confirmReport,
    execute,
    issue,
    recover,
    navigation,
  };
}
