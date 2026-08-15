"use client";

import { useOrganization } from "@clerk/nextjs";
import { useState } from "react";

import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { formatDate } from "@/lib/format";

import type { Subscription, TrialStatus } from "../types";
import { useSubscription } from "./use-subscription";

export type TrialBannerTone = "warning" | "danger";

export interface TrialBannerViewModel {
  tone: TrialBannerTone;
  /** Texto completo (desktop). */
  message: string;
  /** Texto comprimido pra telas < sm (evita overflow do CTA/aviso). */
  compactMessage: string;
  onDismiss: () => void;
}

const RELEVANT_STATUSES: ReadonlySet<TrialStatus> = new Set([
  "trial_ending_soon",
  "trial_expired",
]);

/**
 * Resolve o status "efetivo" do trial a partir do read model do BE.
 *
 * Defesa contra corrida (`days_until_trial_end` negativo, mas `trial_status`
 * ainda não recalculado pelo BE pra `trial_expired`): dias negativos sempre
 * viram `trial_expired`, sobrescrevendo o que o BE mandou.
 */
function resolveTrialStatus(
  subscription: Subscription,
): "trial_ending_soon" | "trial_expired" | null {
  const { trial_status, days_until_trial_end } = subscription;
  if (days_until_trial_end != null && days_until_trial_end < 0) {
    return "trial_expired";
  }
  return RELEVANT_STATUSES.has(trial_status)
    ? (trial_status as "trial_ending_soon" | "trial_expired")
    : null;
}

function pluralDias(n: number): string {
  return n === 1 ? "1 dia" : `${n} dias`;
}

function buildMessages(
  status: "trial_ending_soon" | "trial_expired",
  subscription: Subscription,
): { message: string; compactMessage: string } {
  if (status === "trial_expired") {
    return {
      message:
        "Seu período de teste terminou. Assine um plano para continuar usando a plataforma sem restrições.",
      compactMessage: "Teste expirado.",
    };
  }

  const days = subscription.days_until_trial_end;
  if (days === 0) {
    return {
      message:
        "Seu período de teste termina hoje. Assine um plano para manter o acesso sem interrupções.",
      compactMessage: "Termina hoje.",
    };
  }

  // days > 0 aqui (0 e negativo já tratados acima).
  const n = days ?? 0;
  return {
    message: `Seu período de teste termina em ${pluralDias(n)}, em ${formatDate(
      subscription.trial_ends_at,
    )}. Assine um plano para manter o acesso sem interrupções.`,
    compactMessage: `${pluralDias(n)} restante${n === 1 ? "" : "s"}.`,
  };
}

/** sessionStorage (não localStorage): dispensa só durante a sessão do navegador. */
function dismissKey(
  status: TrialStatus,
  orgId: string | null | undefined,
): string {
  return orgId
    ? `trial-banner-dismissed:${status}:${orgId}`
    : `trial-banner-dismissed:${status}`;
}

/**
 * Estado do banner de trial: busca a assinatura (reusa `useSubscription`, sem
 * chamada de rede duplicada), decide se o banner deve aparecer, monta os
 * textos e controla o dismiss por sessão. `null` = não renderizar nada
 * (não-ADMIN, carregando, erro, ou fora dos estados relevantes do trial).
 *
 * A chave de dismiss embute `trial_status` — trocar de `trial_ending_soon`
 * pra `trial_expired` é uma chave nova, então o aviso reabre automaticamente.
 */
export function useTrialBanner(): TrialBannerViewModel | null {
  const { isAdmin } = useIsOrgAdmin();
  const { organization } = useOrganization();
  const { subscription, isLoading, error } = useSubscription({
    enabled: isAdmin,
  });

  const resolvedStatus = subscription ? resolveTrialStatus(subscription) : null;
  const key = resolvedStatus
    ? dismissKey(resolvedStatus, organization?.id)
    : null;

  // Dismiss desta sessão de navegador. sessionStorage é lido direto no render
  // (leitura síncrona e sem efeito colateral, mesma classe de "external
  // system read" que já fazemos pra `query.subscription`) — evita o
  // setState-em-effect (cascading render) só pra espelhar um valor que já
  // está disponível de forma síncrona.
  const [manuallyDismissedKey, setManuallyDismissedKey] = useState<
    string | null
  >(null);
  const storedDismissed =
    key != null &&
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(key) === "1";
  const dismissed = manuallyDismissedKey === key || storedDismissed;

  if (!isAdmin || isLoading || error || !subscription || !resolvedStatus) {
    return null;
  }
  if (dismissed) return null;

  const { message, compactMessage } = buildMessages(
    resolvedStatus,
    subscription,
  );

  return {
    tone: resolvedStatus === "trial_expired" ? "danger" : "warning",
    message,
    compactMessage,
    onDismiss: () => {
      if (key && typeof window !== "undefined") {
        window.sessionStorage.setItem(key, "1");
      }
      setManuallyDismissedKey(key);
    },
  };
}
