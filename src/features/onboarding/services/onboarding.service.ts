import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  CepLookup,
  CnpjLookup,
  Me,
  OrgProfileInput,
  SyncIdentityInput,
} from "../types";

// Camada de rede da feature: funções tipadas que recebem o fetcher (ligado ao
// Clerk pelo useApi no cliente, ou por auth().getToken no server). Não conhecem
// React nem cache — isso é responsabilidade dos hooks / do layout de gating.

/** Estado do onboarding do usuário atual. */
export async function getMe(fetcher: ApiFetcher): Promise<Me> {
  return fetcher<Me>("/v1/identity/me");
}

/**
 * Provisiona tenant+user+membership de forma SÍNCRONA (JIT) a partir do token —
 * chamado no passo 2, logo após createOrganization+setActive. Devolve o mesmo Me
 * do /identity/me, com `tenant_id` JÁ preenchido: mata a corrida do webhook async
 * (nada de pollar /me por 40s). O BE deriva tenant/role do JWT; o corpo carrega só
 * atributos de display (email/name/org_name).
 */
export async function syncIdentity(
  fetcher: ApiFetcher,
  input: SyncIdentityInput,
): Promise<Me> {
  return fetcher<Me>("/v1/identity/sync", { method: "POST", body: input });
}

/** Grava o perfil da organização (passo 2). Auth ADMIN — resolvido pelo JWT. */
export async function updateOrgProfile(
  fetcher: ApiFetcher,
  input: OrgProfileInput,
): Promise<void> {
  await fetcher<void>("/v1/organization/profile", {
    method: "PUT",
    body: input,
  });
}

/** Consulta cadastral por CNPJ (14 dígitos, sem máscara). */
export async function lookupCnpj(
  fetcher: ApiFetcher,
  cnpj: string,
): Promise<CnpjLookup> {
  return fetcher<CnpjLookup>(`/v1/lookup/cnpj/${cnpj}`);
}

/** Consulta de endereço por CEP (8 dígitos, sem máscara). */
export async function lookupCep(
  fetcher: ApiFetcher,
  cep: string,
): Promise<CepLookup> {
  return fetcher<CepLookup>(`/v1/lookup/cep/${cep}`);
}
