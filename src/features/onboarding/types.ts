// Contratos do BE consumidos no onboarding (lookup CNPJ/CEP, identity, org profile).
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

/** GET /v1/lookup/cnpj/:cnpj */
export interface CnpjLookup {
  cnpj: string;
  legal_name: string;
  trade_name: string;
  address: Address;
}

/** GET /v1/lookup/cep/:cep */
export interface CepLookup {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

/** GET /v1/identity/me — `tenant_id` null enquanto o BE não provisionou o tenant. */
export interface Me {
  user_id: string;
  tenant_id: string | null;
  onboarding_completed_at: string | null;
}

/**
 * POST /v1/identity/sync — atributos de display do provisionamento JIT. O BE deriva
 * tenant/role do JWT; nunca enviamos tenant_id/org_id. Só `email` é obrigatório no BE
 * (app_user.email é NOT NULL); `name`/`org_name` são de conveniência.
 */
export interface SyncIdentityInput {
  email: string;
  name: string;
  org_name: string;
}

/** PUT /v1/organization/profile (Auth ADMIN). */
export interface OrgProfileInput {
  cnpj: string;
  legal_name: string;
  trade_name: string;
  address: Address;
}
