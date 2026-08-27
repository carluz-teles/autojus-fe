"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { dismissOnboardingWidget } from "../services/onboarding-widget.service";
import { ONBOARDING_PROGRESS_KEY } from "./use-onboarding-progress";

/**
 * PATCH /v1/onboarding/dismiss. Invalida o progress no sucesso — a query
 * volta com `dismissed_at` preenchido e o widget some (fonte única: o hook de
 * view-model reage ao dado, não a um flag local espelhado).
 */
export function useDismissOnboardingWidget() {
  const fetcher = useApi();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => dismissOnboardingWidget(fetcher),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ONBOARDING_PROGRESS_KEY }),
  });

  return {
    dismiss: mutation.mutateAsync,
    isDismissing: mutation.isPending,
  };
}
