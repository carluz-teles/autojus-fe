"use client";

import { Button } from "@/components/ui/button";
import { ActivateForm } from "@/features/integrations/components/activate-form";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.step3;
const common = onboardingCopy.common;

// Reutiliza o ActivateForm da feature integrations (passo 3 = configurar fontes).
// "Pular" e "Concluir" levam ambos ao dashboard; a ativação em si é salva pelo
// próprio ActivateForm.
export function Step3Sources({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{t.title}</h2>
        <p className="text-muted-foreground text-sm">{t.description}</p>
      </div>
      <ActivateForm />
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {common.back}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFinish}>
            {common.skip}
          </Button>
          <Button type="button" onClick={onFinish}>
            {common.finish}
          </Button>
        </div>
      </div>
    </div>
  );
}
