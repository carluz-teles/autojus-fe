// Espelha o read model do BE (internal/billing/handler.go — ver
// docs/plano-billing-frontend.md). tenant_id nunca aparece aqui: o BE resolve
// org_id→tenant_id a partir do JWT.

type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

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
