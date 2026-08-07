"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listPlans } from "../services/billing.service";

export const PLANS_KEY = ["billing", "plans"] as const;

/** Catálogo de planos assináveis. `plans: []` cobre tanto loading quanto catálogo vazio de fato — use `isLoading` pra distinguir. */
export function usePlans({ enabled = true }: { enabled?: boolean } = {}) {
  const fetcher = useApi();
  const query = useQuery({
    queryKey: PLANS_KEY,
    queryFn: () => listPlans(fetcher),
    enabled,
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
