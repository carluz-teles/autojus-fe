"use client";

import { useOrganization } from "@clerk/nextjs";
import type { OrganizationCustomRoleKey } from "@clerk/shared/types";

// Papéis do Clerk que o jus usa (o BE mapeia org:admin→ADMIN, resto→LAWYER).
// Rótulos + descrição em pt-BR pra UI; o value é a chave que o Clerk espera.
// Só existem estes DOIS papéis reais hoje (Estagiário do design ainda não é um
// papel do Clerk/BE — entra quando for de fato configurado).
export const ORG_ROLES: {
  value: OrganizationCustomRoleKey;
  label: string;
  desc: string;
}[] = [
  {
    value: "org:admin" as OrganizationCustomRoleKey,
    label: "Administrador",
    desc: "Gerencia o escritório, membros, certificados e cobrança.",
  },
  {
    value: "org:member" as OrganizationCustomRoleKey,
    label: "Advogado",
    desc: "Redige, assina e protocola. Traz a própria OAB ao monitoramento.",
  },
];

export function roleLabel(role: string): string {
  return ORG_ROLES.find((r) => r.value === role)?.label ?? role;
}

// Paginação enxuta; keepPreviousData evita "pisca" ao trocar de página/revalidar.
const PARAMS = {
  memberships: { pageSize: 20, keepPreviousData: true },
  invitations: { pageSize: 20, keepPreviousData: true },
} as const;

/**
 * Hook headless da Organização = tenant. Expõe membros + convites (via
 * useOrganization) — só leitura + o objeto `organization`/`invitations` do
 * Clerk, que os chamadores (ConvidarMembroInline, MembrosList) usam direto
 * pra escrita (inviteMember/revoke), pois cada um precisa rastrear
 * sucesso/falha por ação (toast com o estado real do servidor), o que um
 * wrapper genérico aqui não permitiria. `isAdmin` reflete o papel do
 * usuário atual na org ativa — a UI esconde as ações de escrita para um
 * advogado (o BE também barra via RequireRole).
 *
 * Remover membro NÃO vive aqui: é via BE (DELETE /v1/organization/members/:id,
 * use-remove-org-member.ts) porque o BE aplica ErrCannotRemoveSelf, regra que o
 * Clerk não conhece. Dois caminhos de remoção divergiriam — só o do BE é seguro.
 */
export function useOrgMembers() {
  const { isLoaded, organization, membership, memberships, invitations } =
    useOrganization(PARAMS);

  const isAdmin = membership?.role === "org:admin";

  return {
    isLoaded,
    organization,
    isAdmin,
    currentUserId: membership?.publicUserData?.userId,
    memberships,
    invitations,
  };
}
