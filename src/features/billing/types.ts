// Espelha o read model do BE (internal/billing/handler.go — ver
// docs/plano-billing-frontend.md). tenant_id nunca aparece aqui: o BE resolve
// org_id→tenant_id a partir do JWT.

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled";

export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  active_process_limit: number;
}

export interface Plan {
  price_id: string;
  name: string;
  amount: number; // centavos (padrão Stripe)
  interval: string;
  active_process_limit: number;
}

/** Envelope de lista do BE: { data: [...] } — catálogo pode vir vazio, nunca null. */
export interface PlansEnvelope {
  data: Plan[];
}

export interface CheckoutInput {
  price_id: string;
}

export interface CheckoutResult {
  checkout_url: string;
}

export interface PortalResult {
  portal_url: string;
}
