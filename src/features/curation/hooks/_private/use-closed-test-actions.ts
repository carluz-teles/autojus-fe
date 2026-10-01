"use client";
import { useState } from "react";

import { goldError } from "../../services/annotation-gold";
import type { ClosedPreview } from "../../services/closed-test-schemas";
import {
  type ClosedCommand,
  sendClosedCommand,
} from "../../services/closed-tests";
import type { useClosedTestQueries } from "./use-closed-test-queries";
import { useCurationWrite } from "./use-curation-write";

export function useClosedTestActions(
  q: ReturnType<typeof useClosedTestQueries>,
  allowed: boolean,
) {
  const write = useCurationWrite(allowed, sendClosedCommand, ["curation"]);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState({
    reserve: "",
    run: "",
    report: "",
  });
  const p = q.reservation.data,
    r = q.run.data,
    m = q.metadata.data;
  const locked = !allowed || write.mutation.isPending || write.uncertain;
  const runContext = `${q.context}:${p?.preview.digest}:${q.run.dataUpdatedAt}`;
  const reportContext = `${q.context}:${r?.id}:${r?.definition_digest}:${q.metadata.dataUpdatedAt}`;
  const canExecute =
    !locked &&
    q.runFresh &&
    p?.eligible === true &&
    p.execution_available &&
    r === null;
  // Reading historical evidence has a separate gate; exposure/route changes
  // can disallow dispatch while still permitting an audited report delivery.
  const canIssue =
    !locked &&
    q.runFresh &&
    q.metadataFresh &&
    !!r?.finished_at &&
    r.report_available &&
    m?.eligible !== false;
  const receipt = write.mutation.data;
  const delivery =
    q.metadataFresh &&
    m?.eligible &&
    receipt?.kind === "report" &&
    receipt.receipt.digest === m.digest &&
    receipt.receipt.report.run_id === r?.id &&
    receipt.receipt.report.candidate_id === q.candidate.data?.document.id
      ? receipt.receipt
      : undefined;
  function clearConfirmations() {
    setConfirmation({ reserve: "", run: "", report: "" });
  }
  function confirmRun(checked: boolean) {
    setConfirmation((v) => ({ ...v, run: checked ? runContext : "" }));
  }
  function confirmReport(checked: boolean) {
    setConfirmation((v) => ({ ...v, report: checked ? reportContext : "" }));
  }
  function confirmReserve(context: string) {
    setConfirmation((v) => ({ ...v, reserve: context }));
  }
  async function commit(command: ClosedCommand) {
    if (locked || write.isBusy()) return;
    setMessage(null);
    try {
      if (await write.run(command)) clearConfirmations();
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function reserve(preview: ClosedPreview, context: string) {
    if (
      !q.releaseFresh ||
      q.reservation.data !== null ||
      !q.candidate.data?.eligible ||
      !q.release.data?.eligible ||
      q.release.data.withdrawn ||
      !q.candidate.data.closed_test_available ||
      confirmation.reserve !== context
    )
      return;
    await commit({
      kind: "reserve",
      candidate: preview.candidate_id,
      body: {
        request_id: crypto.randomUUID(),
        selection: preview.selection,
        expected_preview_digest: preview.digest,
        confirmed: true,
      },
    });
  }
  async function execute() {
    if (!canExecute || !p || confirmation.run !== runContext) return;
    await commit({
      kind: "run",
      reservation: p.id,
      body: {
        request_id: crypto.randomUUID(),
        expected_definition_digest: p.preview.digest,
        confirmed: true,
      },
    });
  }
  async function issue() {
    if (!canIssue || !r || !p || confirmation.report !== reportContext) return;
    await commit({
      kind: "report",
      run: r.id,
      reservation: p.id,
      body: {
        request_id: crypto.randomUUID(),
        expected_definition_digest: r.definition_digest,
        confirmed_exposure: true,
      },
    });
  }
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      if (await write.recover()) {
        clearConfirmations();
        setMessage(null);
      }
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  return {
    write,
    locked,
    message,
    confirmation,
    canExecute,
    canIssue,
    delivery,
    confirmReserve,
    confirmRun,
    confirmReport,
    runConfirmed: confirmation.run === runContext,
    reportConfirmed: confirmation.report === reportContext,
    reserve,
    execute,
    issue,
    recover,
    clearConfirmations,
  };
}
