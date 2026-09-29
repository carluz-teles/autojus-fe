"use client";

import { useEffect } from "react";

import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";

import { useCheckoutReturn } from "./use-checkout-return";
import { useOpenPortal } from "./use-open-portal";
import { usePlans } from "./use-plans";
import { useStartCheckout } from "./use-start-checkout";
import { useSubscription } from "./use-subscription";

/**
 * Hook público da aba "Plano & cobrança" (Configurações) — compõe os
 * sub-hooks da feature em vez de refazer fetch (cada um já é a fonte única do
 * seu dado). O componente só lê o resultado daqui, nunca chama os sub-hooks
 * diretamente.
 *
 * MEMBER (não-ADMIN) nunca dispara subscription/plans: os 4 endpoints de
 * billing são ADMIN-only no BE (RequireRole) — a UI não tenta uma ação que a
 * API recusaria com 403 (useIsOrgAdmin, já usado no resto do app pra essa
 * mesma checagem de UX).
 */
export function useBillingPanel() {
  const { isLoaded: isRoleLoaded, isAdmin } = useIsOrgAdmin();
  const canFetch = isRoleLoaded && isAdmin;

  const { confirming, timedOut, refetchInterval, markResolved } =
    useCheckoutReturn();

  const subscriptionQuery = useSubscription({
    enabled: canFetch,
    refetchInterval,
  });
  const hasSubscription = subscriptionQuery.subscription !== null;

  useEffect(() => {
    if (hasSubscription) markResolved();
  }, [hasSubscription, markResolved]);

  const plansEnabled = canFetch && !hasSubscription && !confirming;
  const plansQuery = usePlans({ enabled: plansEnabled });

  const checkout = useStartCheckout();
  const portal = useOpenPortal();

  return {
    isRoleLoaded,
    isAdmin,
    isLoading: !isRoleLoaded || (canFetch && subscriptionQuery.isLoading),
    subscription: subscriptionQuery.subscription,
    confirmingPayment: confirming,
    checkoutTimedOut: timedOut && !hasSubscription,
    plans: plansQuery.plans,
    plansLoading: plansQuery.isLoading,
    plansError: plansQuery.error,
    retryPlans: plansQuery.refetch,
    startCheckout: checkout.start,
    isStartingCheckout: checkout.isPending,
    checkoutConflict: checkout.isConflict,
    checkoutError: checkout.error,
    openPortal: portal.open,
    isOpeningPortal: portal.isPending,
    portalError: portal.error,
  };
}
