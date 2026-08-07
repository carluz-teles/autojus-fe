"use client";

import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { startCheckout } from "../services/billing.service";
import type { CheckoutInput } from "../types";

/**
 * Inicia o Checkout Stripe e redireciona para `checkout_url`. 409 CONFLICT
 * (`ErrAlreadySubscribed` — tenant já ativo/trialing) não é erro genérico de
 * tela: `isConflict` deixa a UI oferecer direto o portal (Fase 5) em vez de
 * repetir o erro cru da API.
 */
export function useStartCheckout() {
  const fetcher = useApi();
  const mutation = useMutation({
    mutationFn: (input: CheckoutInput) => startCheckout(fetcher, input),
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
  });

  const isConflict =
    mutation.error instanceof ApiError && mutation.error.kind === "CONFLICT";

  return {
    startCheckout: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isConflict,
    reset: mutation.reset,
  };
}
