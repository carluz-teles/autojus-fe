"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getOnboardingProgress } from "../services/onboarding-widget.service";

export const ONBOARDING_PROGRESS_KEY = ["onboarding", "progress"] as const;

/** Refetch periódico (30-60s) enquanto o widget está montado — reflete
 * progresso feito por outro membro do tenant sem exigir reload. */
const REFETCH_INTERVAL_MS = 45_000;

/**
 * Sub-hook (responsabilidade: /onboarding/progress). `enabled` é controlado
 * pelo chamador — só busca depois que sabemos que o onboarding já concluiu
 * (não faz sentido perguntar progresso de ativação antes de existir tenant).
 */
export function useOnboardingProgress(enabled: boolean) {
  const fetcher = useApi();
  return useQuery({
    queryKey: ONBOARDING_PROGRESS_KEY,
    queryFn: () => getOnboardingProgress(fetcher),
    enabled,
    refetchInterval: enabled ? REFETCH_INTERVAL_MS : false,
  });
}
