"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getSubscription } from "../services/billing.service";

export const SUBSCRIPTION_KEY = ["billing", "subscription"] as const;

/**
 * Assinatura do tenant atual. `subscription: null` cobre tanto "ainda
 * carregando" quanto "sem assinatura" (404 do BE, já traduzido pelo service) —
 * use `isLoading` pra distinguir.
 *
 * `enabled: false` evita a chamada por completo (ex.: usuário não-ADMIN — a UI
 * nem tenta um endpoint que o BE barraria com 403).
 *
 * `refetchInterval` é repassado ao React Query puro; quem precisa de polling
 * curto (retorno do Checkout, Fase 4) controla o valor e o auto-desligamento.
 */
export function useSubscription({
  enabled = true,
  refetchInterval = false,
}: {
  enabled?: boolean;
  refetchInterval?: number | false;
} = {}) {
  const fetcher = useApi();
  const query = useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: () => getSubscription(fetcher),
    enabled,
    refetchInterval,
    refetchIntervalInBackground: false,
  });

  return {
    subscription: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
