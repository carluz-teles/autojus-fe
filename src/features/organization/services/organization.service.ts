import type { ApiFetcher } from "@/lib/api/use-api";

import type { OrgProfileView } from "../types";

// Camada de rede da feature. A ESCRITA do perfil reusa updateOrgProfile do
// onboarding (mesmo PUT, fonte única) — aqui só entra o que é próprio: a leitura.

/** Perfil fiscal do escritório (qualquer membro lê; a escrita é ADMIN). */
export async function getOrgProfile(
  fetcher: ApiFetcher,
): Promise<OrgProfileView> {
  return fetcher<OrgProfileView>("/v1/organization/profile");
}
