import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/onboarding/components/onboarding-flow";
import type { Me } from "@/features/onboarding/types";
import { apiFetch } from "@/lib/api/client";

// Rota acessível a usuário autenticado SEM org (o proxy exige só sessão). Fica
// fora do grupo (app), portanto sem o shell nem o gating de org. Experiência
// "Linear" full-screen (port de Atjus - Onboarding.dc.html).
export default async function OnboardingPage() {
  // Quem já concluiu o onboarding não deve ver o fluxo — manda pra Inbox.
  // Contrapartida do gating fail-closed do (app): evita prender o usuário aqui.
  // /identity/me fora do ar → mostra o fluxo (idempotente, sem lockout).
  const { userId, getToken } = await auth();
  let completed = false;
  if (userId) {
    try {
      const me = await apiFetch<Me>("/v1/identity/me", { getToken });
      completed = me.onboarding_completed_at != null;
    } catch (err) {
      console.error("[onboarding] /identity/me falhou no server:", err);
      completed = false;
    }
  }
  if (completed) redirect("/");

  return <OnboardingFlow />;
}
