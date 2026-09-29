"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { openPortal } from "../services/billing.service";

/**
 * Abre o Stripe Billing Portal (Fase 3: "Gerenciar assinatura", e Fase 5: a
 * saída oferecida quando um checkout esbarra em 409 CONFLICT) e redireciona
 * assim que a URL volta. `404 ErrNoStripeCustomer` (caso defensivo — não
 * deveria ocorrer com uma subscription não-nula, mas a API pode retornar)
 * chega em `error` sem quebrar a tela; quem chama decide como mostrar.
 */
export function useOpenPortal() {
  const fetcher = useApi();
  const mutation = useMutation({
    mutationFn: () => openPortal(fetcher),
    onSuccess: (portalUrl) => {
      window.location.href = portalUrl;
    },
  });

  return {
    open: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
