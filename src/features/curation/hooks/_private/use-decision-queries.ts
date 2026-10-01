"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useApi } from "@/lib/api/use-api";

import {
  decisionKeys,
  getDecision,
  getDecisionInput,
  listDecisionQueue,
} from "../../services/annotation-decisions";

const filterSchema = z.strictObject({
  state: z.enum(["undecided", "decided", "all"]),
});
export function useDecisionQueueState(allowed: boolean) {
  const api = useApi();
  const form = useForm<z.infer<typeof filterSchema>>({
    resolver: zodResolver(filterSchema),
    defaultValues: { state: "undecided" },
  });
  const state = useWatch({ control: form.control, name: "state" });
  const query = useInfiniteQuery({
    queryKey: [...decisionKeys.all, "queue", state],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listDecisionQueue(api, state, pageParam, signal),
    getNextPageParam: (page) => page.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function more() {
    void query.fetchNextPage();
  }
  function refresh() {
    if (allowed) void query.refetch();
  }
  return {
    form,
    query,
    items: query.data?.pages.flatMap((p) => p.data) ?? [],
    more,
    refresh,
  };
}
export function useDecisionInputState(task: string, allowed: boolean) {
  const api = useApi();
  const query = useQuery({
    queryKey: decisionKeys.input(task),
    queryFn: ({ signal }) => getDecisionInput(api, task, signal),
    enabled: allowed,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
  });
  function refresh() {
    if (allowed) return query.refetch();
  }
  return { query, refresh };
}
export function useDecisionReceiptState(id: string, allowed: boolean) {
  const api = useApi();
  const query = useQuery({
    queryKey: decisionKeys.receipt(id),
    queryFn: ({ signal }) => getDecision(api, id, signal),
    enabled: allowed && !!id,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  function refresh() {
    if (allowed && id) void query.refetch();
  }
  return { query, refresh };
}
