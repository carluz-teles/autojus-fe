"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSubscription } from "./use-subscription";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

export type CheckoutReturnParam = "success" | "canceled" | null;

/**
 * Estado "confirmando pagamento…" ao voltar do Checkout/Portal (Fase 4).
 * Nunca confia na query string como verdade — `?checkout=success` só dispara
 * o polling curto de useSubscription() até o status mudar em relação ao que
 * já estava em cache antes do retorno, ou até estourar o timeout (~15s); a
 * verdade final é sempre o que o BE (via webhook) responder. O polling se
 * AUTO-DESLIGA (isConfirmingPayment vira false) nos dois casos.
 *
 * As transições de `isConfirmingPayment` são ajustadas durante o render (não
 * em efeito) seguindo o padrão do React de "resetar estado quando uma prop
 * muda" — evita o cascading-render que `setState` síncrono dentro de efeito
 * causaria. Só o timeout, que depende de um timer real, usa `useEffect`.
 */
export function useCheckoutConfirmation({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get("checkout") as CheckoutReturnParam;

  const [prevCheckoutParam, setPrevCheckoutParam] =
    useState<CheckoutReturnParam>(checkoutParam);
  const [baselineStatus, setBaselineStatus] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false);

  const query = useSubscription({
    enabled,
    refetchInterval: isConfirmingPayment ? POLL_INTERVAL_MS : false,
  });

  if (checkoutParam !== prevCheckoutParam) {
    setPrevCheckoutParam(checkoutParam);
    if (checkoutParam === "success" && enabled) {
      setBaselineStatus(query.subscription?.status ?? null);
      setConfirmationTimedOut(false);
      setIsConfirmingPayment(true);
    }
  }

  const currentStatus = query.subscription?.status ?? null;
  if (
    isConfirmingPayment &&
    !query.isLoading &&
    currentStatus !== baselineStatus
  ) {
    setIsConfirmingPayment(false);
  }

  useEffect(() => {
    if (!isConfirmingPayment) return;
    const timer = setTimeout(() => {
      setIsConfirmingPayment(false);
      setConfirmationTimedOut(true);
    }, POLL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [isConfirmingPayment]);

  return {
    ...query,
    checkoutParam,
    isConfirmingPayment,
    confirmationTimedOut,
  };
}
