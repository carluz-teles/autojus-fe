"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  getFeedbackQueue,
  listFeedbackCurationScopes,
  listFeedbackQueues,
} from "../../services/feedback-queues";

export function useFeedbackCurationScopeQuery(allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ["curation", "feedback-curation-scopes"],
    queryFn: ({ signal }) => listFeedbackCurationScopes(api, signal),
    enabled: allowed,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
export function useFeedbackQueueQuery(id: string, allowed: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ["curation", "feedback-queue", id],
    queryFn: ({ signal }) => getFeedbackQueue(api, id, signal),
    enabled: allowed,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}
export function useFeedbackQueueList(scope: string, allowed: boolean) {
  const api = useApi();
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const cursor = cursors.at(-1) ?? null;
  const query = useQuery({
    queryKey: ["curation", "feedback-queues", scope, cursor],
    queryFn: ({ signal }) => listFeedbackQueues(api, scope, cursor, signal),
    enabled: allowed,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const data =
    allowed && query.isSuccess && !query.isFetching ? query.data : undefined;
  function next() {
    const next = data?.page.next_cursor;
    if (next) setCursors([...cursors, next]);
  }
  function previous() {
    if (cursors.length > 1) setCursors(cursors.slice(0, -1));
  }
  function refresh() {
    if (allowed) void query.refetch();
  }
  return {
    query,
    rows: data?.data ?? [],
    hasPrevious: cursors.length > 1,
    hasNext: !!data?.page.next_cursor,
    next,
    previous,
    refresh,
  };
}
