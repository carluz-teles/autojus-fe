"use client";
import { useInfiniteQuery, useQueries } from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  comparisonKeys,
  type ComparisonPlan,
  comparisonSourceProblem,
  getComparisonSource,
  listComparisons,
} from "../services/comparisons";
import {
  type ComparisonProtection,
  useComparisonActions,
} from "./_private/use-comparison-actions";
import { useEvaluationAccess, useEvaluationWorkspace } from "./use-evaluations";

export function useComparisonWorkspace(id: string) {
  const api = useApi(),
    workspace = useEvaluationWorkspace(id);
  const { allowed } = workspace;
  const actions = useComparisonActions(allowed);
  const [selected, setSelected] = useState<ComparisonPlan[]>([]);
  const sources = useQueries({
    queries: selected.map((plan) => ({
      queryKey: comparisonKeys.source(plan.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getComparisonSource(api, plan, signal),
      enabled: allowed,
      retry: false,
    })),
  });
  const history = useInfiniteQuery({
    queryKey: comparisonKeys.list(id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listComparisons(api, id, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const refs = sources.flatMap((q) =>
    q.data?.report
      ? [{ report_id: q.data.report.id, expected_digest: q.data.report.digest }]
      : [],
  );
  const context = JSON.stringify([id, refs]);
  const sameSplit = selected.every((p) => p.split === selected[0]?.split);
  const sourcesReady =
    selected.length >= 2 &&
    selected.length <= 3 &&
    sources.every(
      (q) =>
        q.isSuccess &&
        !q.isFetching &&
        comparisonSourceProblem(q.data) === null,
    );
  const releaseReady =
    workspace.release.isSuccess &&
    !workspace.release.isFetching &&
    workspace.release.data.eligible &&
    !workspace.release.data.withdrawn;
  const canCreate =
    allowed && !actions.locked && releaseReady && sameSplit && sourcesReady;
  function toggle(plan: ComparisonPlan) {
    if (
      actions.locked ||
      actions.write.isBusy() ||
      plan.release_id !== id ||
      !plan.pipeline
    )
      return;
    if (!selected.some((p) => p.id === plan.id) && selected.length >= 3) return;
    actions.reset();
    setSelected((items) =>
      items.some((p) => p.id === plan.id)
        ? items.filter((p) => p.id !== plan.id)
        : items.length < 3
          ? [...items, plan]
          : items,
    );
  }
  function reference(plan: string) {
    if (actions.locked || actions.write.isBusy()) return;
    actions.reset();
    setSelected((items) => [
      ...items.filter((p) => p.id === plan),
      ...items.filter((p) => p.id !== plan),
    ]);
  }
  async function create() {
    await actions.submit(
      {
        kind: "create",
        command: {
          release: id,
          body: {
            request_id: crypto.randomUUID(),
            sources: refs,
            confirmed_exposure: true,
          },
        },
      },
      context,
      canCreate,
    );
  }
  async function refresh() {
    if (!allowed) return;
    await Promise.all([
      workspace.refresh(),
      history.refetch(),
      ...sources.map((q) => q.refetch()),
      actions.refresh(),
    ]);
  }
  function moreHistory() {
    if (allowed && !history.isFetching) void history.fetchNextPage();
  }
  return {
    workspace,
    allowed,
    selected,
    sources,
    sameSplit,
    canCreate,
    context,
    actions,
    toggle,
    reference,
    create,
    refresh,
    history,
    historyItems: history.data?.pages.flatMap((p) => p.data) ?? [],
    moreHistory,
  };
}

export function useComparisonDetail(
  id: string,
  protection: ComparisonProtection = {},
) {
  const allowed = useEvaluationAccess();
  const actions = useComparisonActions(allowed, id, protection);
  const metadata = actions.metadata.data;
  const context = JSON.stringify([id, metadata?.digest, metadata?.eligible]);
  const canIssue = allowed && !actions.locked && actions.metadataReady;
  async function issue() {
    if (!metadata) return;
    await actions.submit(
      {
        kind: "issue",
        command: {
          id,
          body: {
            request_id: crypto.randomUUID(),
            expected_digest: metadata.digest,
            confirmed_exposure: true,
          },
        },
      },
      context,
      canIssue,
    );
  }
  return { allowed, actions, context, canIssue, issue };
}
