"use client";

import { Button } from "@/components/ui/button";
import { ActivateForm } from "@/features/integrations/components/activate-form";

import { onboardingCopy } from "../copy";

const t = onboardingCopy.processes;
const common = onboardingCopy.common;

// Passo "Seus processos" — o passo do VALOR: é aqui que entram as OABs e a fonte
// que fazem os processos chegarem sozinhos (o "aha" do produto). Reutiliza o
// ActivateForm da feature integrations; a ativação em si é salva por ele. Pular é
// permitido, mas o custo fica explícito (skipCost).
export function Step3Sources({
  onFinish,
  onBack,
}: {
  onFinish: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl tracking-tight">{t.title}</h2>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          {t.description}
        </p>
      </div>
      <ActivateForm />
      <div className="flex items-center justify-between gap-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          {common.back}
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={onFinish}>
            {common.skip}
          </Button>
          <Button type="button" onClick={onFinish}>
            {common.next}
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground text-center text-xs">{t.skipCost}</p>
    </div>
  );
}
