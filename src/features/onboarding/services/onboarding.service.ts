import type { ApiFetcher } from "@/lib/api/use-api";

import type { CepLookup, Me, OrgProfileInput } from "../types";

// Camada de rede da feature: funções tipadas que recebem o fetcher (ligado ao
// Clerk pelo useApi no cliente, ou por auth().getToken no server). Não conhecem
// React nem cache — isso é responsabilidade dos hooks / do layout de gating.

/** Estado do onboarding do usuário atual (poll até `tenant_id` aparecer). */
export async function getMe(fetcher: ApiFetcher): Promise<Me> {
  return fetcher<Me>("/v1/identity/me");
}

export async function completePersonalProfile(
  fetcher: ApiFetcher,
  firstName: string,
  lastName: string,
): Promise<void> {
  await fetcher<void>("/v1/identity/profile/complete", {
    method: "POST",
    body: { first_name: firstName, last_name: lastName },
  });
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

/** Consulta de endereço por CEP (8 dígitos, sem máscara). */
export async function lookupCep(
  fetcher: ApiFetcher,
  cep: string,
): Promise<CepLookup> {
  return fetcher<CepLookup>(`/v1/lookup/cep/${cep}`);
}
