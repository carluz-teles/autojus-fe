"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { openPortal } from "../services/billing.service";

/**
 * Abre o Stripe Customer Portal (troca de plano/cartão, cancelamento, faturas —
 * tudo delegado ao Stripe, nada disso é reimplementado aqui) e redireciona pra
 * `portal_url`. 404 (`ErrNoStripeCustomer`) é caso defensivo: não deveria
 * ocorrer quando já há assinatura, mas o hook expõe o erro sem quebrar a tela.
 */
export function useOpenPortal() {
  const fetcher = useApi();
  const mutation = useMutation({
    mutationFn: () => openPortal(fetcher),
    onSuccess: (result) => {
      window.location.href = result.portal_url;
    },
  });

  return {
    openPortal: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
