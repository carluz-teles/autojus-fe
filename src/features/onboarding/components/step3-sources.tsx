"use client";

import { Button } from "@/components/ui/button";
import { ActivateForm } from "@/features/integrations/components/activate-form";

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
      <ActivateForm />
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Voltar
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onFinish}>
            Pular
          </Button>
          <Button type="button" onClick={onFinish}>
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
}
