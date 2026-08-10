"use client";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/errors";

import { useOpenPortal } from "../hooks/use-open-portal";

/**
 * Botão "Gerenciar assinatura" → Stripe Customer Portal. Reusado tanto pelo
 * card do assinante (Fase 3) quanto pelo aviso de conflito 409 no checkout
 * (Fase 5) — mesma ação, mesmo tratamento de erro defensivo (404
 * ErrNoStripeCustomer não deveria ocorrer, mas não pode quebrar a tela).
 */
export function ManageSubscriptionButton({
  label = "Gerenciar assinatura",
}: {
  label?: string;
}) {
  const { openPortal, isPending, error } = useOpenPortal();

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" onClick={() => openPortal()} disabled={isPending}>
        {isPending ? "Abrindo…" : label}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error instanceof ApiError
            ? error.message
            : "Não foi possível abrir o portal de cobrança."}
        </p>
      ) : null}
    </div>
  );
}
