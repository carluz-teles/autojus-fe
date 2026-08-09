import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import type { Me } from "@/features/onboarding/types";
import { apiFetch } from "@/lib/api/client";

// Gating do shell (Server Component). O proxy já garante a sessão. A conclusão do
// onboarding é a ÚNICA verdade, e vem do BE: /identity/me.onboarding_completed_at,
// que resolve pelo USER do token (independe da org ATIVA na sessão).
//
// NÃO gateamos por auth().orgId: com "Membership optional" o Clerk pode deixar a
// sessão sem org ativa (contexto pessoal) no refresh, mesmo o usuário tendo
// escritório. Gatear por orgId jogava de volta pro onboarding quem já concluiu —
// e como /onboarding devolve os concluídos ao /dashboard, virava LOOP, ignorando
// o onboarding_completed_at. A org ativa é garantida no client (EnsureActiveOrg),
// concern separado do gating.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, getToken } = await auth();
  if (!userId) redirect("/sign-in");

  // Onboarding concluído = /identity/me.onboarding_completed_at preenchido.
  // apiFetch continua sendo o único ponto de I/O (aqui com o token do server).
  // Fail-CLOSED: se não conseguimos confirmar a conclusão, mandamos ao wizard —
  // ele é idempotente e a própria /onboarding devolve ao dashboard quem já
  // concluiu, então não há lockout (só um passo extra num /identity/me fora do ar).
  let onboardingCompleted = false;
  try {
    const me = await apiFetch<Me>("/v1/identity/me", { getToken });
    onboardingCompleted = me.onboarding_completed_at != null;
  } catch (err) {
    // Fail-closed, mas NUNCA silencioso: sem este log, um /me quebrado no
    // server manda todo mundo pro wizard sem deixar rastro em lugar nenhum.
    console.error(
      "[gate] /identity/me falhou no server — mandando ao wizard:",
      err,
    );
    onboardingCompleted = false;
  }
  if (!onboardingCompleted) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
