"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";

import { goldError } from "../services/annotation-gold";
import {
  type CandidateForm,
  emptyCandidateForm,
  parseCandidateForm,
} from "../services/candidate-form";
import {
  candidateCommand,
  candidateKeys,
  freezeCandidate,
  getCandidate,
  listCandidates,
} from "../services/candidates";
import { useCurationWrite } from "./_private/use-curation-write";
import { useComparisonDetail } from "./use-comparisons";
import { useEvaluationAccess } from "./use-evaluations";

export function useCandidateSelection(id: string) {
  const allowed = useEvaluationAccess(),
    api = useApi();
  const write = useCurationWrite(allowed, freezeCandidate, candidateKeys.all);
  const [form, setForm] = useState(emptyCandidateForm),
    [dirty, setDirty] = useState(false),
    [attempted, setAttempted] = useState(false);
  const [reviewed, setReviewed] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [message, setMessage] = useState<string | null>(null);
  const comparison = useComparisonDetail(id, {
    dirty: dirty || write.uncertain || write.mutation.isPending,
    locked: write.uncertain || write.mutation.isPending,
  });
  const delivery = comparison.actions.delivery;
  const parsed = parseCandidateForm(form, delivery);
  const context =
    delivery && parsed.body
      ? JSON.stringify([id, delivery.digest, delivery.delivery_id, parsed.body])
      : "";
  const locked =
    !allowed ||
    write.mutation.isPending ||
    write.uncertain ||
    comparison.actions.write.mutation.isPending ||
    comparison.actions.write.uncertain;
  const ready =
    allowed && !locked && delivery?.document.comparison.split === "validation";
  const checked = !!context && confirmation === context && reviewed === context;
  const reviewedBody = ready && reviewed === context ? parsed.body : null;
  const release = comparison.actions.metadata.data?.release_id ?? "";
  const history = useInfiniteQuery({
    queryKey: candidateKeys.list(release),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listCandidates(api, release, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed && !!release,
    retry: false,
  });
  const savedID = write.mutation.data?.document.id ?? "";
  const saved = useCandidateDetail(savedID);
  const receipt =
    saved.fresh && saved.query.data?.digest === write.mutation.data?.digest
      ? saved.query.data
      : undefined;
  function change(update: (previous: CandidateForm) => CandidateForm) {
    if (locked || write.isBusy() || comparison.actions.write.isBusy()) return;
    setForm(update);
    setDirty(true);
    setReviewed("");
    setConfirmation("");
    setMessage(null);
    write.mutation.reset();
  }
  function review() {
    if (!ready || write.isBusy()) return;
    setAttempted(true);
    setConfirmation("");
    setReviewed(parsed.body ? context : "");
    setMessage(
      parsed.body
        ? null
        : "Confira os campos indicados antes de congelar a seleção.",
    );
  }
  function confirm(value: boolean) {
    if (ready && reviewedBody) setConfirmation(value ? context : "");
  }
  async function freeze() {
    if (!ready || !checked || !delivery || write.isBusy()) return;
    const command = candidateCommand(delivery, form, crypto.randomUUID());
    if (!command) return;
    setMessage(null);
    try {
      if (await write.run(command)) {
        setConfirmation("");
        setReviewed("");
        setDirty(false);
      }
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function recover() {
    if (!allowed || write.isBusy()) return;
    try {
      if (await write.recover()) {
        setConfirmation("");
        setReviewed("");
        setDirty(false);
        setMessage(null);
      }
    } catch (error) {
      setMessage(goldError(error));
    }
  }
  async function refresh() {
    if (!allowed) return;
    setReviewed("");
    setConfirmation("");
    await Promise.all([
      comparison.actions.refresh(),
      ...(release ? [history.refetch()] : []),
      ...(savedID ? [saved.query.refetch()] : []),
    ]);
  }
  function more() {
    if (allowed && !history.isFetching) void history.fetchNextPage();
  }
  return {
    allowed,
    form,
    change,
    locked,
    ready,
    comparison,
    delivery,
    review,
    reviewedBody,
    checked,
    confirm,
    freeze,
    recover,
    refresh,
    write,
    receipt,
    saved,
    history,
    items: history.data?.pages.flatMap((p) => p.data) ?? [],
    more,
    errors: attempted ? parsed.errors : {},
    message,
  };
}

export function useCandidateDetail(id: string) {
  const allowed = useEvaluationAccess(),
    api = useApi();
  const query = useQuery({
    queryKey: candidateKeys.detail(id),
    queryFn: ({ signal }) => getCandidate(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
  });
  const fresh = allowed && query.isSuccess && !query.isFetching;
  async function refresh() {
    if (allowed && id) await query.refetch();
  }
  return { allowed, query, fresh, refresh };
}
