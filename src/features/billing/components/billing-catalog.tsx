"use client";

import { AlertTriangle, PackageOpen } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

import type { Plan } from "../types";
import { BillingPlanCard } from "./billing-plan-card";

/**
 * Estado "sem assinatura" (Fase 2): catálogo em cards. Fase 5 (409 CONFLICT no
 * checkout) entra aqui como um Alert oferecendo direto o portal, em vez do
 * erro cru da API — o usuário tentou assinar de novo estando ativo/trialing.
 */
export function BillingCatalog({
  plans,
  isLoading,
  error,
  onRetry,
  onSubscribe,
  isSubmitting,
  isConflict,
  checkoutError,
  onOpenPortal,
  isOpeningPortal,
}: {
  plans: Plan[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  onSubscribe: (priceId: string) => void;
  isSubmitting: boolean;
  isConflict: boolean;
  checkoutError: unknown;
  onOpenPortal: () => void;
  isOpeningPortal: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Não foi possível carregar os planos.</AlertTitle>
        <AlertDescription>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isConflict ? (
        <Alert>
          <AlertTitle>Sua assinatura já está ativa.</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <p>
              Gerencie o plano atual, troque de cartão ou cancele pelo portal da
              Stripe.
            </p>
            <Button
              size="sm"
              className="w-fit"
              disabled={isOpeningPortal}
              onClick={onOpenPortal}
            >
              Gerenciar assinatura
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {!isConflict && checkoutError ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Não foi possível iniciar o checkout.</AlertTitle>
          <AlertDescription>Tente novamente em instantes.</AlertDescription>
        </Alert>
      ) : null}

      {plans.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="Nenhum plano disponível no momento"
          description="Fale com o time para liberar um plano para o seu escritório."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <BillingPlanCard
              key={plan.price_id}
              plan={plan}
              onSubscribe={onSubscribe}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}
