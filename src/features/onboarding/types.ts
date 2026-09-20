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

/** Persona do tenant, escolhida no onboarding — espelha `tenant.account_type` do BE.
 * `solo` = advogado autônomo (sem razão social/CNPJ/time); `firm` = escritório. */
export type AccountType = "solo" | "firm";

/** GET /v1/identity/me — `tenant_id` null enquanto o BE não provisionou o tenant.
 * `account_type` "" enquanto a persona não foi declarada (perfil ainda em branco). */
export interface Me {
  user_id: string;
  tenant_id: string | null;
  onboarding_completed_at: string | null;
  role: Role;
  account_type: AccountType | "";
}

/** PUT /v1/organization/profile (Auth ADMIN). O BE valida os campos de escritório
 * (razão social/CNPJ) só quando `account_type === "firm"`; no `solo` eles vão vazios. */
export interface OrgProfileInput {
  /** Persona: obrigatória. Decide quais campos abaixo o BE exige. */
  account_type: AccountType;
  /** CNPJ (14 dígitos, sem máscara). Obrigatório só no firm; "" no solo. */
  cnpj?: string;
  /** Telefone do escritório (10-11 dígitos), opcional (coletado em Configurações). */
  phone?: string;
  /** E-mail da organização, opcional (coletado em Configurações). */
  email?: string;
  /** Razão social. Obrigatória só no firm; "" no solo. */
  legal_name?: string;
  /** Nome fantasia — opcional; fallback: a própria razão social. */
  trade_name?: string;
  /** Endereço é opcional no produto ("Adicionar endereço"); ausente = não enviado. */
  address?: Address;
}
