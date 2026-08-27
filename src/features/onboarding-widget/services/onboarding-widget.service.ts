import type { ApiFetcher } from "@/lib/api/use-api";

import type { OnboardingProgress } from "../types";

// Camada de rede da feature — funções tipadas que recebem o fetcher (mesma
// convenção de src/features/onboarding/services/onboarding.service.ts).

/** Progresso de ativação do escritório (widget "Comece por aqui"). */
export async function getOnboardingProgress(
  fetcher: ApiFetcher,
): Promise<OnboardingProgress> {
  return fetcher<OnboardingProgress>("/v1/onboarding/progress");
}

/** Dispensa o guia — não há "reativar depois" (decisão de produto). */
export async function dismissOnboardingWidget(
  fetcher: ApiFetcher,
): Promise<void> {
  await fetcher<void>("/v1/onboarding/dismiss", { method: "PATCH" });
}
