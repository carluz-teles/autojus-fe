"use client";

import { useIsOrgAdmin } from "@/features/organization/hooks/use-org-role";
import { ApiError } from "@/lib/api/errors";

import { useSubscription } from "../hooks/use-subscription";
import { BillingAdminOnlyNotice } from "./billing-admin-only-notice";
import { BillingError } from "./billing-error";
import { BillingSkeleton } from "./billing-skeleton";
import { PlanCatalog } from "./plan-catalog";
import { SubscriptionCard } from "./subscription-card";

export function BillingPanel() {
  const { isLoaded: isOrgLoaded, isAdmin } = useIsOrgAdmin();
  const { subscription, isLoading, error, refetch } = useSubscription({
    enabled: isOrgLoaded && isAdmin,
  });

  if (!isOrgLoaded) return <BillingSkeleton />;
  if (!isAdmin) return <BillingAdminOnlyNotice />;
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

  return subscription ? (
    <div className="mt-8">
      <SubscriptionCard subscription={subscription} />
    </div>
  ) : (
    <PlanCatalog />
  );
}
