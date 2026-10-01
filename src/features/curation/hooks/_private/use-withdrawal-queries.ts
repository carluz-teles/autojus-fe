"use client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getWithdrawalImpact,
  listWithdrawalPolicies,
  listWithdrawalSources,
  withdrawalKeys,
  type WithdrawalScope,
} from "../../services/withdrawals";
export function useWithdrawalLists(allowed: boolean) {
  const api = useApi();
  const sources = useInfiniteQuery({
    queryKey: [...withdrawalKeys.all, "sources"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listWithdrawalSources(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  const policies = useInfiniteQuery({
    queryKey: [...withdrawalKeys.all, "policies"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      listWithdrawalPolicies(api, pageParam, signal),
    getNextPageParam: (p) => p.page.next_cursor,
    enabled: allowed,
    retry: false,
  });
  function refresh() {
    if (allowed) {
      void sources.refetch();
      void policies.refetch();
    }
  }
  function moreSources() {
    if (allowed && !sources.isFetching) void sources.fetchNextPage();
  }
  function morePolicies() {
    if (allowed && !policies.isFetching) void policies.fetchNextPage();
  }
  return {
    sources,
    policies,
    sourceItems: sources.data?.pages.flatMap((p) => p.data) ?? [],
    policyItems: policies.data?.pages.flatMap((p) => p.data) ?? [],
    refresh,
    moreSources,
    morePolicies,
  };
}
export function useWithdrawalImpactQuery(
  scope: WithdrawalScope,
  target: string,
  allowed: boolean,
) {
  const api = useApi();
  return useQuery({
    queryKey: withdrawalKeys.impact(scope, target),
    queryFn: ({ signal }) => getWithdrawalImpact(api, scope, target, signal),
    enabled: allowed,
    retry: false,
  });
}
