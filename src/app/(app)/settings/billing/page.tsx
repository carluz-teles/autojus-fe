import { Suspense } from "react";

import { BillingPanel } from "@/features/billing/components/billing-panel";
import { BillingSkeleton } from "@/features/billing/components/billing-skeleton";

// Seção Cobrança: assinatura Stripe (catálogo, estado atual, portal de
// gerenciamento). BillingPanel lê `?checkout=` (retorno do Checkout/Portal)
// via useSearchParams — exige Suspense no App Router (Next 16).
export default function SettingsBillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingPanel />
    </Suspense>
  );
}
