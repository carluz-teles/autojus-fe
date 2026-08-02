"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ONBOARDING_STEPS, onboardingCopy } from "../copy";
import { Step1Person } from "./step1-person";
import { Step2Company } from "./step2-company";
import { Step3Sources } from "./step3-sources";

/**
 * Casca client do onboarding: stepper centralizado + o conteúdo do passo num Card.
 * Os passos e toda a linguagem vêm de ../copy (fonte única). O estado do passo é
 * UI efêmera (useState); a lógica de cada passo vive nos hooks das steps. Passos
 * 1 e 2 ficam montados (ocultos) para preservar os dados ao voltar; o 3 monta sob
 * demanda (o ActivateForm só busca integrações após a org existir).
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const goTo = useCallback((n: number) => setStep(n), []);
  const finish = useCallback(() => router.push("/dashboard"), [router]);

  return (
    <div className="flex flex-col gap-8">
      <ol
        className="flex items-center justify-center gap-4"
        aria-label={onboardingCopy.stepper.aria}
      >
        {ONBOARDING_STEPS.map(({ id, label }, i) => {
          const state = id === step ? "current" : id < step ? "done" : "todo";
          return (
            <li key={id} className="flex items-center gap-4">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2.5 text-sm",
                  state === "current"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs tabular-nums transition-colors",
                    state === "current" &&
                      "border-primary bg-primary text-primary-foreground shadow-sm",
                    state === "done" &&
                      "border-primary/40 bg-primary/10 text-primary",
                  )}
                >
                  {id}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {i < ONBOARDING_STEPS.length - 1 ? (
                <span aria-hidden className="bg-border h-px w-8 sm:w-14" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* O filete de latão no topo é a assinatura "Ledger" do card do wizard. */}
      <Card className="border-t-gold/70 border-t-2 p-8 shadow-md sm:p-12">
        <div className={cn(step !== 1 && "hidden")}>
          <Step1Person onDone={() => goTo(2)} />
        </div>
        <div className={cn(step !== 2 && "hidden")}>
          <Step2Company onDone={() => goTo(3)} onBack={() => goTo(1)} />
        </div>
        {step === 3 ? (
          <Step3Sources onFinish={finish} onBack={() => goTo(2)} />
        ) : null}
      </Card>
    </div>
  );
}
