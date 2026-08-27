// Contratos do BE consumidos no onboarding (lookup CEP, identity, org profile).
// Snake_case espelha o JSON do backend Go; nunca enviamos tenant_id/org_id (o BE
// resolve org_id→tenant_id pelo JWT).

export interface Address {
  cep: string;
  logradouro: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  uf: string;
}

/** GET /v1/lookup/cep/:cep */
export interface CepLookup {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** Papel do usuário no escritório — mesmos literais de `OrgMemberView.role`. */
export type Role = "ADMIN" | "LAWYER";

/** GET /v1/identity/me — `tenant_id` null enquanto o BE não provisionou o tenant. */
export interface Me {
  user_id: string;
  tenant_id: string | null;
  onboarding_completed_at: string | null;
  role: Role;
}

/** PUT /v1/organization/profile (Auth ADMIN). */
export interface OrgProfileInput {
  cnpj: string;
  /** Telefone do escritório (10-11 dígitos), opcional. */
  phone?: string;
  /** E-mail da organização, opcional (persistência via tenant.email do BE). */
  email?: string;
  /** Razão social — sem UI própria; fallback: nome da empresa. */
  legal_name: string;
  trade_name: string;
  /** Endereço é opcional no produto ("Adicionar endereço"); ausente = não enviado. */
  address?: Address;
}
