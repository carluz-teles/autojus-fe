// Lógica pura de derivação de estado visual dos passos — sem React, sem I/O.
// Regra do produto: o estado de cada passo reflete o booleano real dele.
//   - "done"    → `done[id] === true`, em qualquer posição (mesmo fora de ordem).
//   - "current" → o primeiro passo com `done=false` na ordem — só ele ganha
//                 descrição + CTA visíveis.
//   - "future"  → passo com `done=false` que não é o current.
// Um passo concluído fora de ordem (ex.: "Convide seu time" antes de "Conecte
// suas OABs") aparece com check imediatamente — o contador "X de Y" e os
// checks nunca divergem.

import type { OnboardingStepId } from "../types";

export type OnboardingStepStatus = "done" | "current" | "future";

export interface ResolvedOnboardingStep {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
}

/** Índice do primeiro passo não concluído na ordem, ou -1 se todos concluídos. */
function firstNotDoneIndex(
  order: OnboardingStepId[],
  done: Record<OnboardingStepId, boolean>,
): number {
  return order.findIndex((id) => !done[id]);
}

/** Todo mundo concluído = não há passo "atual" → widget deve sumir. */
export function hasCurrentStep(
  order: OnboardingStepId[],
  done: Record<OnboardingStepId, boolean>,
): boolean {
  return firstNotDoneIndex(order, done) !== -1;
}

export function resolveStepStatuses(
  order: OnboardingStepId[],
  done: Record<OnboardingStepId, boolean>,
): ResolvedOnboardingStep[] {
  const currentIndex = firstNotDoneIndex(order, done);
  return order.map((id, i) => {
    let status: OnboardingStepStatus;
    if (done[id]) status = "done";
    else if (i === currentIndex) status = "current";
    else status = "future";
    return { id, status };
  });
}

/** Contagem real de passos concluídos (para o rótulo "X de Y"). */
export function countDoneSteps(
  order: OnboardingStepId[],
  done: Record<OnboardingStepId, boolean>,
): number {
  return order.filter((id) => done[id]).length;
}
