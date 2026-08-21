import type { ApiFetcher } from "@/lib/api/use-api";

import type { OrgMemberView, OrgProfileView } from "../types";

// Camada de rede da feature. A ESCRITA do perfil reusa updateOrgProfile do
// onboarding (mesmo PUT, fonte única) — aqui só entra o que é próprio: a leitura.

/** Perfil fiscal do escritório (qualquer membro lê; a escrita é ADMIN). */
export async function getOrgProfile(
  fetcher: ApiFetcher,
): Promise<OrgProfileView> {
  return fetcher<OrgProfileView>("/v1/organization/profile");
}

/**
 * Membros ATIVOS do escritório — GET /v1/organization/members → {data:[...]}. O BE
 * devolve o time inteiro (pequeno) sem cursor; qualquer membro lê. Usado para
 * resolver o nome do responsável (assignee_user_id) nas listas de tarefas.
 */
export async function listOrgMembers(
  fetcher: ApiFetcher,
): Promise<OrgMemberView[]> {
  const res = await fetcher<{ data: OrgMemberView[] }>(
    "/v1/organization/members",
  );
  return res.data;
}

/**
 * Remove um membro ATIVO do escritório — DELETE /v1/organization/members/:id
 * (Auth ADMIN). Único caminho de remoção do produto: o BE recusa a auto-remoção
 * (ErrCannotRemoveSelf), regra que uma chamada direta ao Clerk não conhece.
 */
export async function removeOrgMember(
  fetcher: ApiFetcher,
  id: string,
): Promise<void> {
  await fetcher<void>(`/v1/organization/members/${id}`, { method: "DELETE" });
}
