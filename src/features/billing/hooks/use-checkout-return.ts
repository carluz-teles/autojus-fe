"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 15000;

/**
 * Fase 4 — retorno do Checkout/Portal. NUNCA confia na query string
 * (`?checkout=success`) como resultado: ela só decide SE liga o poll curto de
 * `useSubscription()` — a verdade é sempre o refetch, o webhook da Stripe pode
 * ainda não ter processado quando o usuário volta do redirect.
 *
 * `refetchInterval` é o que o chamador passa pro `useSubscription()` que já
 * está chamando de qualquer forma (não duplica a query). O chamador avisa
 * `markResolved()` assim que `subscription` deixa de ser `null` — dali em
 * diante `confirming` cai e `refetchInterval` volta a `false` sozinho.
 * `timedOut` cobre o caso do webhook não ter chegado dentro de ~15s: mensagem
 * de "ainda processando", nunca um erro.
 */
export function useCheckoutReturn() {
  const params = useSearchParams();
  const isCheckoutSuccess = params.get("checkout") === "success";
  const [polling, setPolling] = useState(isCheckoutSuccess);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!polling) return undefined;
    const id = setTimeout(() => {
      setPolling(false);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [polling]);

  const markResolved = useCallback(() => setPolling(false), []);

  return {
    confirming: isCheckoutSuccess && polling,
    timedOut: isCheckoutSuccess && timedOut,
    refetchInterval: polling ? POLL_INTERVAL_MS : (false as const),
    markResolved,
  };
}
