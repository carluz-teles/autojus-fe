"use client";

import { Loader2, ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { useBillingPanel } from "../hooks/use-billing-panel";
import { BillingCatalog } from "./billing-catalog";
import { BillingSubscriberView } from "./billing-subscriber-view";

/**
 * Painel da aba "Plano & cobrança" (Configurações) — substitui o placeholder
 * "Em breve". Único componente que chama o hook público da feature; decide
 * entre os estados (carregando / MEMBER / confirmando pagamento / catálogo /
 * assinante) e delega o JSX de cada um aos componentes dedicados.
 */
export function BillingPanel() {
  const vm = useBillingPanel();

  if (!vm.isRoleLoaded) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!vm.isAdmin) {
    return (
      <Alert>
        <ShieldAlert />
        <AlertTitle>Só administradores gerenciam o plano.</AlertTitle>
        <AlertDescription>
          Peça para um administrador do escritório acessar esta seção para ver o
          plano atual, assinar ou gerenciar a cobrança.
        </AlertDescription>
      </Alert>
    );
  }

  if (vm.confirmingPayment) {
    return (
      <Alert>
        <Loader2 className="animate-spin" />
        <AlertTitle>Confirmando pagamento…</AlertTitle>
        <AlertDescription>
          Isso pode levar alguns instantes enquanto processamos a confirmação da
          Stripe.
        </AlertDescription>
      </Alert>
    );
  }

  if (vm.checkoutTimedOut) {
    return (
      <Alert>
        <AlertTitle>Ainda processando o pagamento.</AlertTitle>
        <AlertDescription>
          Isso pode levar alguns instantes. Atualize a página em breve para ver
          o status mais recente.
        </AlertDescription>
      </Alert>
    );
  }

  if (vm.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (vm.subscription) {
    return (
      <BillingSubscriberView
        subscription={vm.subscription}
        onOpenPortal={() => vm.openPortal()}
        isOpeningPortal={vm.isOpeningPortal}
        portalError={vm.portalError}
      />
    );
  }

  return (
    <BillingCatalog
      plans={vm.plans}
      isLoading={vm.plansLoading}
      error={vm.plansError}
      onRetry={() => vm.retryPlans()}
      onSubscribe={(priceId) => vm.startCheckout(priceId)}
      isSubmitting={vm.isStartingCheckout}
      isConflict={vm.checkoutConflict}
      checkoutError={vm.checkoutError}
      onOpenPortal={() => vm.openPortal()}
      isOpeningPortal={vm.isOpeningPortal}
    />
  );
}
