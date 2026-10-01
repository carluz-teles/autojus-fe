"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";

import { importContextEntries } from "../../services/import-context";
import {
  getSamplingFrame,
  getSamplingPopulation,
  getSamplingSource,
  listSamplingFrames,
} from "../../services/sampling";

export function useSamplingQueries(enabled: boolean) {
  const api = useApi();
  const population = useSamplingPopulationQuery(enabled);
  const frames = useInfiniteQuery({
    queryKey: ["curation", "sampling-frames"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listSamplingFrames(api, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled,
    retry: false,
  });
  function refresh() {
    void population.refetch();
    void frames.refetch();
  }
  function loadMore() {
    void frames.fetchNextPage();
  }
  return {
    population,
    frames,
    refresh,
    loadMore,
    summaries: frames.data?.pages.flatMap((page) => page.data) ?? [],
  };
}
export function useSamplingPopulationQuery(enabled: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ["curation", "sampling-population"],
    queryFn: ({ signal }) => getSamplingPopulation(api, signal),
    enabled,
    retry: false,
  });
}
export function useSamplingDetail(id: string, enabled: boolean) {
  const api = useApi();
  const query = useQuery({
    queryKey: ["curation", "sampling-frame", id],
    queryFn: ({ signal }) => getSamplingFrame(api, id, signal),
    enabled,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.valid === false ? false : 30000,
  });
  function refresh() {
    void query.refetch();
  }
  const plan = query.data?.plan;
  const composition = plan
    ? Object.entries(plan.stratum_targets).map(([key, target]) => ({
        key,
        target,
        actual: plan.stratum_counts[key as keyof typeof plan.stratum_counts],
        deficit:
          plan.stratum_deficits[key as keyof typeof plan.stratum_deficits],
      }))
    : [];
  return { query, refresh, composition };
}
export function useSamplingSourceView(id: string, enabled: boolean) {
  const [opened, setOpened] = useState(false),
    api = useApi();
  const query = useQuery({
    queryKey: ["curation", "sampling-source", id],
    queryFn: ({ signal }) => getSamplingSource(api, id, signal),
    enabled: enabled && opened,
    retry: false,
  });
  function toggle() {
    setOpened((current) => !current);
  }
  const context = query.data
    ? importContextEntries(query.data.facts.context).filter(
        ([, value]) => value !== null,
      )
    : [];
  return { opened, toggle, query, context };
}
