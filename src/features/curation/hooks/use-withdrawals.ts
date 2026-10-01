"use client";
import type {
  WithdrawalImpact,
  WithdrawalScope,
} from "../services/withdrawals";
import { useScopedWithdrawal } from "./_private/use-scoped-withdrawal";
import {
  useWithdrawalImpactQuery,
  useWithdrawalLists,
} from "./_private/use-withdrawal-queries";
import { useBackofficeContext } from "./use-backoffice-context";
export function useWithdrawalWorkspace() {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return { allowed, ...useWithdrawalLists(allowed) };
}
export function useWithdrawalPage(scope: WithdrawalScope, target: string) {
  const allowed =
      useBackofficeContext().capabilities.includes("curation.publish"),
    query = useWithdrawalImpactQuery(scope, target, allowed);
  function refresh() {
    if (allowed) void query.refetch();
  }
  return { allowed, query, refresh };
}
export function useScopedWithdrawalForm(
  impact: WithdrawalImpact,
  loading: boolean,
) {
  const allowed =
    useBackofficeContext().capabilities.includes("curation.publish");
  return useScopedWithdrawal(impact, allowed, loading);
}
