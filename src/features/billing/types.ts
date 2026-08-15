// Espelha o read model do BE (internal/billing/handler.go — ver
// docs/plano-billing-frontend.md). tenant_id nunca aparece aqui: o BE resolve
// org_id→tenant_id a partir do JWT.

export type SubscriptionStatus =
  "trialing" | "active" | "past_due" | "canceled";

/** Estado do trial, calculado pelo BE a partir de `trial_ends_at`. */
export type TrialStatus =
  "not_in_trial" | "trial_active" | "trial_ending_soon" | "trial_expired";

export interface Subscription {
  plan: string;
  status: SubscriptionStatus;
  current_period_end: string | null;
  active_process_limit: number;
  trial_ends_at: string | null;
  days_until_trial_end: number | null;
  trial_status: TrialStatus;
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
