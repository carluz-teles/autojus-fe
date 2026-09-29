"use client";

import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { startCheckout } from "../services/billing.service";

/**
 * Abre o Checkout da Stripe pro plano escolhido (Fase 2) e redireciona
 * (`window.location.href`) assim que a URL volta — nunca fica esperando o
 * componente decidir o que fazer com ela.
 *
 * `409 CONFLICT` (Fase 5: tenant já tem assinatura ativa/trialing,
 * `ErrAlreadySubscribed` no BE) é exposto separadamente via `isConflict`, pra
 * o componente oferecer direto o botão de "Gerenciar assinatura" em vez de
 * mostrar o erro cru — `error` continua disponível pra qualquer outro caso
 * (400/5xx/rede).
 */
export function useStartCheckout() {
  const fetcher = useApi();
  const mutation = useMutation({
    mutationFn: (priceId: string) => startCheckout(fetcher, priceId),
    onSuccess: (checkoutUrl) => {
      window.location.href = checkoutUrl;
    },
  });

  const isConflict =
    mutation.error instanceof ApiError && mutation.error.kind === "CONFLICT";

  return {
    start: mutation.mutate,
    isPending: mutation.isPending,
    isConflict,
    error: isConflict ? null : mutation.error,
  };
}
