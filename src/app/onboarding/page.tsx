import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OrganizationCoordinator } from "@/components/shell/organization-coordinator";
import PlatformProviders from "@/components/shell/platform-providers";

// Rota acessível a usuário autenticado SEM org (o proxy exige só sessão). Fica
// fora do grupo (app), portanto sem o shell nem o gating de org. Experiência
// "Linear" full-screen (port de Atjus - Onboarding.dc.html).
export default async function OnboardingPage() {
  // Quem já concluiu o onboarding não deve ver o fluxo — manda para Notificações.
  // Contrapartida do gating fail-closed do (app): evita prender o usuário aqui.
  // /identity/me fora do ar → mostra o fluxo (idempotente, sem lockout).
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <PlatformProviders>
      <OrganizationCoordinator mode="onboarding" />
    </PlatformProviders>
  );
}
