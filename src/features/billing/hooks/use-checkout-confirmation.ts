"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useSubscription } from "./use-subscription";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15000;

export type CheckoutReturnParam = "success" | "canceled" | "return" | null;

/**
 * Só `success` (voltou de um Checkout novo) e `return` (voltou do Portal —
 * pode ter trocado cartão, cancelado, mudado de plano) disparam a confirmação;
 * `canceled` (desistiu do Checkout, nada mudou) e `null` não.
 */
function triggersConfirmation(param: CheckoutReturnParam): boolean {
  return param === "success" || param === "return";
}

/**
 * Estado "confirmando…" ao voltar do Checkout/Portal (Fase 4 + fechamento do
 * gap do retorno do Portal). Nunca confia na query string como verdade —
 * `?checkout=success|return` só dispara o polling curto de useSubscription()
 * até o status mudar em relação ao que já estava em cache antes do retorno,
 * ou até estourar o timeout (~15s); a verdade final é sempre o que o BE (via
 * webhook) responder. O polling se AUTO-DESLIGA (isConfirmingPayment vira
 * false) nos dois casos.
 *
 * As transições de `isConfirmingPayment` são ajustadas durante o render (não
 * em efeito) seguindo o padrão do React de "resetar estado quando uma prop
 * muda" — evita o cascading-render que `setState` síncrono dentro de efeito
 * causaria. Só o timeout, que depende de um timer real, usa `useEffect`.
 *
 * `prevCheckoutParam` começa em `undefined` (fora do domínio de
 * `CheckoutReturnParam`), não no valor atual de `checkoutParam` — o caso que
 * importa de fato é o redirect da Stripe chegando com `?checkout=success` (ou
 * `=return`) já presente no primeiro mount, e um sentinel que nasce igual ao
 * valor atual nunca detectaria essa "mudança".
 *
 * Enquanto `enabled` for `false` (ex.: org do Clerk ainda carregando em
 * `BillingPanel`), um `checkoutParam` que dispararia confirmação não é
 * "consumido" — não marcamos `prevCheckoutParam` como já visto — para não
 * perder a transição quando `enabled` virar `true` num render seguinte sem o
 * valor da query string ter mudado de novo.
 */
export function useCheckoutConfirmation({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get("checkout") as CheckoutReturnParam;

  const [prevCheckoutParam, setPrevCheckoutParam] = useState<
    CheckoutReturnParam | undefined
  >(undefined);
  const [baselineStatus, setBaselineStatus] = useState<string | null>(null);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false);

  const query = useSubscription({
    enabled,
    refetchInterval: isConfirmingPayment ? POLL_INTERVAL_MS : false,
  });

  if (
    checkoutParam !== prevCheckoutParam &&
    (!triggersConfirmation(checkoutParam) || enabled)
  ) {
    setPrevCheckoutParam(checkoutParam);
    if (triggersConfirmation(checkoutParam) && enabled) {
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
  if (
    confirmationTimedOut &&
    !query.isLoading &&
    currentStatus !== baselineStatus
  ) {
    setConfirmationTimedOut(false);
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
