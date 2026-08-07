"use client";

import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { ApiError } from "@/lib/api/errors";

import { useCheckoutConfirmation } from "../hooks/use-checkout-confirmation";
import { BillingAdminOnlyNotice } from "./billing-admin-only-notice";
import { BillingError } from "./billing-error";
import { BillingSkeleton } from "./billing-skeleton";
import { ConfirmingPayment } from "./confirming-payment";
import { PlanCatalog } from "./plan-catalog";
import { SubscriptionCard } from "./subscription-card";

export function BillingPanel() {
  const { isLoaded: isOrgLoaded, isAdmin } = useIsOrgAdmin();
  const {
    subscription,
    isLoading,
    error,
    refetch,
    isConfirmingPayment,
    confirmationTimedOut,
  } = useCheckoutConfirmation({ enabled: isOrgLoaded && isAdmin });

  if (!isOrgLoaded) return <BillingSkeleton />;
  if (!isAdmin) return <BillingAdminOnlyNotice />;
  if (isConfirmingPayment) return <ConfirmingPayment />;
  if (isLoading) return <BillingSkeleton />;

  if (error) {
    return (
      <BillingError
        message={
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar sua assinatura."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      {confirmationTimedOut ? (
        <p role="status" className="text-muted-foreground mt-8 text-sm">
          Ainda processando seu pagamento — isso pode levar alguns instantes.{" "}
          <button
            type="button"
            onClick={() => refetch()}
            className="text-primary underline underline-offset-4"
          >
            Verificar novamente
          </button>
        </p>
      ) : null}
      {subscription ? (
        <div className="mt-8">
          <SubscriptionCard subscription={subscription} />
        </div>
      ) : (
        <PlanCatalog />
      )}
    </>
  );
}
