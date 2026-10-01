"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import type { PreparedTask } from "../../services/annotation-preparation";
import {
  getInferenceRoute,
  inferenceConfirmationSchema,
  inferenceKeys,
  inferencePending,
  listInferenceJobs,
  requestInference,
} from "../../services/inference";
import { useAnnotationNavigation } from "./use-annotation-navigation";
import { useCurationWrite } from "./use-curation-write";
import { useRAGSelection } from "./use-rag-selection";

export function useInferenceState(
  task: PreparedTask,
  protocolDigest: string,
  authorized: boolean,
  valid: boolean,
  canUseRAG: boolean,
) {
  const api = useApi(),
    [open, setOpen] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  const allowed = authorized && task.mode === "assisted";
  const route = useQuery({
    queryKey: inferenceKeys.route,
    queryFn: ({ signal }) => getInferenceRoute(api, signal),
    enabled: allowed && open,
    retry: false,
  });
  const jobs = useQuery({
    queryKey: inferenceKeys.jobs(task.id),
    queryFn: ({ signal }) => listInferenceJobs(api, task.id, signal),
    enabled: allowed && open,
    retry: false,
    refetchInterval: (q) =>
      allowed &&
      open &&
      q.state.status !== "error" &&
      q.state.data?.some(inferencePending)
        ? 2000
        : false,
  });
  const write = useCurationWrite(allowed, requestInference, inferenceKeys.all);
  const rag = useRAGSelection(
    task,
    allowed && open && canUseRAG,
    write.mutation.isPending || write.uncertain,
  );
  const form = useForm<z.infer<typeof inferenceConfirmationSchema>>({
    resolver: zodResolver(inferenceConfirmationSchema),
    defaultValues: { confirmed_context: "", uncertain_context: "" },
  });
  const values = useWatch({ control: form.control });
  const observed = jobs.data?.[0],
    received = write.mutation.data;
  const latest =
    received && (!observed || received.attempt > observed.attempt)
      ? received
      : observed;
  const context = [
    task.id,
    task.snapshot_digest,
    protocolDigest,
    route.data?.digest,
    latest?.id,
    latest?.state,
    rag.selected,
    rag.result?.id,
  ].join(":");
  const confirmed = values.confirmed_context === context,
    acknowledged = values.uncertain_context === context;
  const ready =
    allowed &&
    open &&
    valid &&
    !!protocolDigest &&
    route.data?.enabled === true &&
    !!route.data.route &&
    jobs.data !== undefined &&
    !route.isError &&
    !jobs.isError &&
    !route.isFetching &&
    !jobs.isFetching;
  const locked = write.mutation.isPending || write.uncertain || rag.locked;
  const canSubmit =
    ready &&
    !locked &&
    rag.selectionReady &&
    !inferencePending(latest) &&
    (latest?.attempt ?? 0) < 32;
  const navigation = useAnnotationNavigation(
    write.uncertain ||
      write.mutation.isPending ||
      form.formState.isDirty ||
      rag.write.uncertain ||
      rag.write.mutation.isPending ||
      rag.form.formState.isDirty,
  );
  function openPanel() {
    if (allowed) setOpen(true);
  }
  function closePanel() {
    if (locked) return;
    form.reset();
    rag.reset();
    setOpen(false);
    setMessage(null);
  }
  function confirm(e: ChangeEvent<HTMLInputElement>) {
    form.setValue("confirmed_context", e.target.checked ? context : "", {
      shouldDirty: true,
    });
  }
  function acknowledge(e: ChangeEvent<HTMLInputElement>) {
    form.setValue("uncertain_context", e.target.checked ? context : "", {
      shouldDirty: true,
    });
  }
  async function refresh() {
    if (!allowed || !open) return;
    await Promise.all([route.refetch(), jobs.refetch()]);
  }
  const submit = form.handleSubmit(async (v) => {
    if (!canSubmit || write.isBusy()) return;
    if (v.confirmed_context !== context) {
      setMessage(
        "Confira a configuração e confirme o consumo desta tentativa.",
      );
      return;
    }
    if (latest?.state === "uncertain" && v.uncertain_context !== context) {
      setMessage(
        "Reconheça que a execução anterior pode ter consumido o provider.",
      );
      return;
    }
    setMessage(null);
    try {
      const result = await write.run({
        task: task.id,
        body: {
          request_id: crypto.randomUUID(),
          expected_snapshot_digest: task.snapshot_digest,
          expected_protocol_digest: protocolDigest,
          expected_route_digest: route.data!.digest,
          expected_previous_job_id: latest?.id ?? null,
          acknowledged_uncertain_job_id:
            latest?.state === "uncertain" ? latest.id : null,
          confirmed: true,
          ...(rag.selected && rag.result
            ? { rag_query_id: rag.result.id }
            : {}),
        },
      });
      if (result) form.reset();
    } catch {
      /* The shared command hook preserves the exact uncertain request. */
    }
  });
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      const result = await write.recover();
      if (result) form.reset();
    } catch {
      /* Keep the receipt recovery action visible. */
    }
  }
  return {
    allowed,
    open,
    openPanel,
    closePanel,
    route,
    jobs,
    latest,
    write,
    form,
    context,
    confirmed,
    acknowledged,
    confirm,
    acknowledge,
    ready,
    locked,
    canSubmit,
    navigation,
    submit,
    recover,
    refresh,
    message,
    rag,
  };
}
