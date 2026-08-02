"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ONBOARDING_STEPS, onboardingCopy } from "../copy";
import { StepTeam } from "./step-team";
import { Step2Company } from "./step2-company";
import { Step3Sources } from "./step3-sources";

/**
 * Casca client do onboarding: stepper centralizado + o conteúdo do passo num Card.
 * Os passos e toda a linguagem vêm de ../copy (fonte única). Fluxo de valor:
 * ① Sua empresa (cria a org/tenant) → ② Seus processos (OAB/fontes — o "aha") →
 * ③ Convide seu time. O nome vem do sign-up do Clerk e a foto vive no /profile,
 * então não há passo de dados pessoais. O passo da empresa fica montado (oculto)
 * para preservar o form ao voltar; os demais montam sob demanda (precisam da org
 * ativa, que só existe após o passo 1).
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
          <Step2Company onDone={() => goTo(2)} />
        </div>
        {step === 2 ? (
          <Step3Sources onFinish={() => goTo(3)} onBack={() => goTo(1)} />
        ) : null}
        {step === 3 ? (
          <StepTeam onFinish={finish} onBack={() => goTo(2)} />
        ) : null}
      </Card>
    </div>
  );
}
