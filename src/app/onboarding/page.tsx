import { Wordmark } from "@/components/shell/brand-mark";
import { OnboardingWizard } from "@/features/onboarding/components/onboarding-wizard";

// Rota acessível a usuário autenticado SEM org (o proxy exige só sessão). Fica
// fora do grupo (app), portanto sem o shell nem o gating de org.
export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="reveal flex flex-col gap-4">
        <Wordmark />
        <div>
          <h1 className="font-display text-2xl leading-tight tracking-tight">
            Vamos configurar sua conta
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Três passos rápidos para começar a monitorar seus processos.
          </p>
        </div>
      </div>
      <OnboardingWizard />
    </div>
  );
}
