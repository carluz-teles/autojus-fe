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

/**
 * GET /v1/organization/members — um membro ATIVO do escritório (id INTERNO do BE,
 * não org_id/user do Clerk). Alimenta o seletor de responsável e resolve o nome do
 * assignee_user_id nas listas de tarefas. O time é pequeno; volta inteiro em
 * `{data:[...]}` sem cursor.
 */
export interface OrgMemberView {
  id: string;
  name: string;
  email: string;
  role: string;
}
