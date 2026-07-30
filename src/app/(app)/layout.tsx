import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import type { Me } from "@/features/onboarding/types";
import { apiFetch } from "@/lib/api/client";

// Gating do shell (Server Component). O proxy já garante a sessão; aqui exigimos
// org (tenant) + onboarding concluído. Sem qualquer um dos dois → /onboarding.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, orgId, getToken } = await auth();

  // Sem org ativa: passos 1–2 do onboarding ainda não terminaram.
  if (!userId || !orgId) redirect("/onboarding");

  // Onboarding concluído = /identity/me.onboarding_completed_at preenchido.
  // apiFetch continua sendo o único ponto de I/O (aqui com o token do server).
  // Fail-CLOSED: se não conseguimos confirmar a conclusão, mandamos ao wizard —
  // ele é idempotente e a própria /onboarding devolve ao dashboard quem já
  // concluiu, então não há lockout (só um passo extra num /identity/me fora do ar).
  let onboardingCompleted = false;
  try {
    const me = await apiFetch<Me>("/v1/identity/me", { getToken });
    onboardingCompleted = me.onboarding_completed_at != null;
  } catch {
    onboardingCompleted = false;
  }
  if (!onboardingCompleted) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
