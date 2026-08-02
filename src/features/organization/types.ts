import type { Address } from "@/features/onboarding/types";

/** GET /v1/organization/profile — o profileView do BE (o mesmo que o PUT ecoa). */
export interface OrgProfileView {
  cnpj: string;
  legal_name: string;
  trade_name: string;
  phone?: string | null;
  email?: string | null;
  address?: Address | null;
  onboarding_completed_at: string | null;
}
