import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/shell/brand-mark";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";
import { onboardingCopy } from "@/features/onboarding/copy";
import type { Me } from "@/features/onboarding/types";
import { apiFetch } from "@/lib/api/client";

// Rota acessível a usuário autenticado SEM org (o proxy exige só sessão). Fica
// fora do grupo (app), portanto sem o shell nem o gating de org.
export default async function OnboardingPage() {
  // Quem já concluiu o onboarding não deve ver o wizard — manda ao dashboard.
  // Contrapartida do gating fail-closed do (app): evita prender o usuário aqui.
  // /identity/me fora do ar → mostra o wizard (idempotente, sem lockout).
  const { userId, getToken } = await auth();
  let completed = false;
  if (userId) {
    try {
      const me = await apiFetch<Me>("/v1/identity/me", { getToken });
      completed = me.onboarding_completed_at != null;
    } catch (err) {
      // Espelho do gate do (app): a falha do /me no server precisa deixar rastro.
      console.error("[onboarding] /identity/me falhou no server:", err);
      completed = false;
    }
  }
  if (completed) redirect("/dashboard");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-4 py-16">
      <div className="reveal flex flex-col items-center gap-4 text-center">
        <Wordmark />
        <div>
          <h1 className="font-display text-2xl leading-tight tracking-tight">
            {onboardingCopy.page.title}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {onboardingCopy.page.subtitle}
          </p>
        </div>
      </div>
      <OnboardingWizard />
    </div>
  );
}
