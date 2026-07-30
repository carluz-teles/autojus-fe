"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { cn } from "@/lib/utils";

import { Step1Person } from "./step1-person";
import { Step2Company } from "./step2-company";
import { Step3Sources } from "./step3-sources";

const STEPS = [
  { n: 1, label: "Seus dados" },
  { n: 2, label: "Sua empresa" },
  { n: 3, label: "Fontes" },
] as const;

/**
 * Casca client do onboarding: indicador de 3 passos + navegação. O estado do
 * passo é UI efêmera (useState); a lógica de cada passo vive nos hooks das steps.
 * Passos 1 e 2 ficam montados (ocultos) para preservar os dados ao voltar; o 3
 * monta sob demanda (o ActivateForm só busca integrações após a org existir).
 */
export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const goTo = useCallback((n: number) => setStep(n), []);
  const finish = useCallback(() => router.push("/dashboard"), [router]);

  return (
    <div className="flex flex-col gap-8">
      <ol
        className="flex items-center gap-3"
        aria-label="Progresso do onboarding"
      >
        {STEPS.map(({ n, label }, i) => {
          const state = n === step ? "current" : n < step ? "done" : "todo";
          return (
            <li key={n} className="flex items-center gap-3">
              <span
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  state === "current"
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs tabular-nums",
                    state === "current" &&
                      "border-primary bg-primary text-primary-foreground",
                    state === "done" && "border-primary/40 text-primary",
                  )}
                >
                  {n}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </span>
              {i < STEPS.length - 1 ? (
                <span aria-hidden className="bg-border h-px w-6 sm:w-10" />
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className={cn(step !== 1 && "hidden")}>
        <Step1Person onDone={() => goTo(2)} />
      </div>
      <div className={cn(step !== 2 && "hidden")}>
        <Step2Company onDone={() => goTo(3)} onBack={() => goTo(1)} />
      </div>
      {step === 3 ? (
        <Step3Sources onFinish={finish} onBack={() => goTo(2)} />
      ) : null}
    </div>
  );
}
