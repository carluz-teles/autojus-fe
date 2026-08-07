"use client";

import { ApiError } from "@/lib/api/errors";

import { usePlans } from "../hooks/use-plans";
import { useStartCheckout } from "../hooks/use-start-checkout";
import { BillingError } from "./billing-error";
import { BillingSkeleton } from "./billing-skeleton";
import { ManageSubscriptionButton } from "./manage-subscription-button";
import { PlanCard } from "./plan-card";

export function PlanCatalog() {
  const { plans, isLoading, error, refetch } = usePlans();
  const checkout = useStartCheckout();

  // 409 CONFLICT (ErrAlreadySubscribed): tentou assinar já estando ativo/trialing
  // (cache desatualizado, duplo clique, outra aba). Não repete o erro cru da
  // API — oferece direto a ação de gerenciar a assinatura existente.
  if (checkout.isConflict) {
    return (
      <div className="mt-8 flex flex-col items-start gap-3 rounded-xl border p-6">
        <p className="text-sm">
          Sua organização já tem uma assinatura ativa. Gerencie por aqui em vez
          de assinar de novo.
        </p>
        <ManageSubscriptionButton />
      </div>
    );
  }

  if (isLoading) return <BillingSkeleton />;

  if (error) {
    return (
      <BillingError
        message={
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar os planos."
        }
        onRetry={refetch}
      />
    );
  }

  if (plans.length === 0) {
    return (
      <p className="text-muted-foreground mt-8 text-sm">
        Nenhum plano disponível no momento.
      </p>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {plans.map((plan) => (
        <PlanCard
          key={plan.price_id}
          plan={plan}
          onSubscribe={() =>
            checkout.startCheckout({ price_id: plan.price_id })
          }
          isPending={checkout.isPending}
        />
      ))}
    </div>
  );
}
