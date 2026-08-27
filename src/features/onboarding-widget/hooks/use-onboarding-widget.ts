"use client";

import { useMe } from "@/features/onboarding/hooks/use-me";
import type { Role } from "@/features/onboarding/types";

import {
  ONBOARDING_STEP_ORDER,
  ONBOARDING_STEPS_COPY,
  onboardingWidgetCopy,
  remainingStepsLabel,
} from "../copy";
import {
  countDoneSteps,
  hasCurrentStep,
  type OnboardingStepStatus,
  resolveStepStatuses,
} from "../lib/steps";
import type { OnboardingStepId } from "../types";
import { useDismissOnboardingWidget } from "./use-dismiss-onboarding-widget";
import { useOnboardingProgress } from "./use-onboarding-progress";
import { useWidgetCollapsed } from "./use-widget-collapsed";

export interface OnboardingWidgetStepViewModel {
  id: OnboardingStepId;
  status: OnboardingStepStatus;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export interface OnboardingWidgetViewModel {
  role: Role;
  title: string;
  steps: OnboardingWidgetStepViewModel[];
  doneCount: number;
  totalCount: number;
  remainingLabel: string;
  progressLabel: string;
  progressPct: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDismiss: () => void;
  isDismissing: boolean;
}

/**
 * View-model do widget "Comece por aqui". `null` = não deve renderizar nada
 * (onboarding ainda não concluído, progress não carregado/com erro, guia
 * dispensado, ou todos os passos concluídos — regra do produto: sem estado
 * "tudo pronto" persistente, o widget simplesmente some).
 *
 * Fonte única: visibilidade deriva 100% do servidor (`/me` +
 * `/onboarding/progress`), nunca de um flag local espelhado.
 */
export function useOnboardingWidget(): OnboardingWidgetViewModel | null {
  const { data: me, isPending: isMePending } = useMe();
  const { collapsed, toggle } = useWidgetCollapsed();
  const { dismiss, isDismissing } = useDismissOnboardingWidget();

  const onboardingCompleted = !!me?.onboarding_completed_at;
  const { data: progress, isPending: isProgressPending } =
    useOnboardingProgress(onboardingCompleted);

  if (isMePending || !me || !onboardingCompleted) return null;
  if (isProgressPending || !progress) return null;
  if (progress.dismissed_at != null) return null;

  const order = ONBOARDING_STEP_ORDER[me.role];
  if (!hasCurrentStep(order, progress.steps)) return null;

  const resolved = resolveStepStatuses(order, progress.steps);
  const doneCount = countDoneSteps(order, progress.steps);
  const totalCount = order.length;

  return {
    role: me.role,
    title: onboardingWidgetCopy.title[me.role],
    steps: resolved.map(({ id, status }) => ({
      ...ONBOARDING_STEPS_COPY[id],
      status,
    })),
    doneCount,
    totalCount,
    remainingLabel: remainingStepsLabel(totalCount - doneCount),
    progressLabel: `${doneCount} de ${totalCount}`,
    progressPct: totalCount === 0 ? 0 : (doneCount / totalCount) * 100,
    collapsed,
    onToggleCollapse: toggle,
    onDismiss: () => void dismiss(),
    isDismissing,
  };
}
