"use client";

import { ApiError } from "@/lib/api/errors";

import { usePlans } from "../hooks/use-plans";
import { useStartCheckout } from "../hooks/use-start-checkout";
import { BillingError } from "./billing-error";
import { BillingSkeleton } from "./billing-skeleton";
import { PlanCard } from "./plan-card";

export function PlanCatalog() {
  const { plans, isLoading, error, refetch } = usePlans();
  const checkout = useStartCheckout();

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
