"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getMe } from "../services/onboarding.service";

export const ME_KEY = ["identity", "me"] as const;

/**
 * Sub-hook (responsabilidade: /identity/me). Server state via React Query.
 *
 * Polling que se AUTO-DESLIGA (regra do ERD): enquanto `poll` estiver ligado e o
 * BE ainda não provisionou o tenant, refaz a busca a cada 2s; quando `tenant_id`
 * deixa de ser null (estado terminal do saga de provisionamento), retorna `false`
 * e o timer para sozinho.
 */
export function useMe(poll = false) {
  const fetcher = useApi();
  const { isLoaded, orgId } = useAuth();
  return useQuery({
    // /identity/me is organization-scoped. Keeping the org in the key prevents
    // a tenant resolved before setActive/refresh from leaking into the personal
    // session (orgId=null) or another organization.
    queryKey: [...ME_KEY, orgId],
    queryFn: () => getMe(fetcher),
    enabled: isLoaded && Boolean(orgId),
    refetchInterval: (query) =>
      poll && !query.state.data?.tenant_id ? 2000 : false,
    refetchIntervalInBackground: false,
  });
}
