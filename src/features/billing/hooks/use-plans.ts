"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getPlans } from "../services/billing.service";

const PLANS_KEY = ["billing", "plans"] as const;

/**
 * Catálogo de planos (Fase 2). `plans` nunca é `undefined` para quem consome —
 * `[]` cobre tanto "ainda carregando" quanto "catálogo vazio de fato"; use
 * `isLoading` para distinguir (o componente mostra skeleton vs. estado vazio).
 *
 * `enabled: false` evita a chamada por completo (ex.: usuário não-ADMIN — a UI
 * nem tenta um endpoint que o BE barraria com 403).
 */
export function usePlans({ enabled = true }: { enabled?: boolean } = {}) {
  const fetcher = useApi();
  const query = useQuery({
    queryKey: PLANS_KEY,
    queryFn: () => getPlans(fetcher),
    enabled,
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
