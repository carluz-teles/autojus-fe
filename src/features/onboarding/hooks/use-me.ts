"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getMe } from "../services/onboarding.service";

export const ME_KEY = ["identity", "me"] as const;

/**
 * Sub-hook (responsabilidade: /identity/me). Server state via React Query.
 *
 * Sem polling: o provisionamento do tenant é SÍNCRONO no BE (GetMe provisiona na
 * própria request — sem webhook). A query é keyada pelo `orgId`, então dispara
 * uma única vez assim que a org fica ativa (`setActive`), e o `tenant_id` já volta
 * provisionado nesse primeiro fetch.
 */
export function useMe() {
  const fetcher = useApi();
  const { isLoaded, orgId } = useAuth();
  return useQuery({
    // /identity/me is organization-scoped. Keeping the org in the key prevents
    // a tenant resolved before setActive/refresh from leaking into the personal
    // session (orgId=null) or another organization.
    queryKey: [...ME_KEY, orgId],
    queryFn: () => getMe(fetcher),
    enabled: isLoaded && Boolean(orgId),
  });
}
