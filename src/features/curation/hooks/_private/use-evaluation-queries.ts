"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getRelease, releaseKeys } from "../../services/dataset-releases";
import {
  evaluationKeys,
  evaluationPoll,
  evaluationTerminal,
  getEvaluationPlan,
  getEvaluationReportMetadata,
  getEvaluationRun,
  listEvaluationPlans,
} from "../../services/evaluations";

export function useEvaluationLists(id: string, allowed: boolean) {
  const api = useApi();
  const release = useQuery({
    queryKey: releaseKeys.detail(id),
    queryFn: ({ signal }) => getRelease(api, id, signal),
    enabled: allowed,
    retry: false,
  });
  const plans = useInfiniteQuery({
    queryKey: evaluationKeys.list(id),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listEvaluationPlans(api, id, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function more() {
    if (allowed && !plans.isFetching) void plans.fetchNextPage();
  }
  async function refresh() {
    if (allowed) await Promise.all([release.refetch(), plans.refetch()]);
  }
  return {
    release,
    plans,
    items: plans.data?.pages.flatMap((p) => p.data) ?? [],
    more,
    refresh,
  };
}
export function useEvaluationQueries(id: string, allowed: boolean) {
  const api = useApi();
  const plan = useQuery({
    queryKey: evaluationKeys.plan(id),
    queryFn: ({ signal }) => getEvaluationPlan(api, id, signal),
    enabled: allowed,
    retry: false,
  });
  const run = useQuery({
    queryKey: evaluationKeys.run(id),
    queryFn: ({ signal }) => getEvaluationRun(api, id, signal),
    enabled: allowed,
    retry: false,
    refetchInterval: (q) =>
      allowed ? evaluationPoll(q.state.data, q.state.status) : false,
  });
  const runID = run.data?.id ?? "";
  const metadataEnabled =
    allowed &&
    plan.isSuccess &&
    run.isSuccess &&
    evaluationTerminal(run.data) &&
    run.data?.report_available !== false;
  const metadata = useQuery({
    queryKey: evaluationKeys.report(runID),
    queryFn: ({ signal }) => getEvaluationReportMetadata(api, runID, signal),
    enabled: metadataEnabled,
    retry: false,
  });
  async function refresh() {
    if (!allowed) return;
    await Promise.all([
      plan.refetch(),
      run.refetch(),
      ...(metadataEnabled ? [metadata.refetch()] : []),
    ]);
  }
  return { plan, run, metadata, refresh };
}
