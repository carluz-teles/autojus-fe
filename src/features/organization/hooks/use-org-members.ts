"use client";

import { useOrganization } from "@clerk/nextjs";
import type { OrganizationCustomRoleKey } from "@clerk/shared/types";
import { useCallback, useState } from "react";

// Papéis do Clerk que o jus usa (o BE mapeia org:admin→ADMIN, resto→LAWYER).
// Rótulos em pt-BR pra UI; o value é a chave que o Clerk espera.
export const ORG_ROLES: { value: OrganizationCustomRoleKey; label: string }[] =
  [
    { value: "org:admin" as OrganizationCustomRoleKey, label: "Administrador" },
    { value: "org:member" as OrganizationCustomRoleKey, label: "Advogado" },
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
 * useOrganization) e as ações de admin (convidar, revogar, trocar papel, remover),
 * cada uma revalidando a lista que tocou. Substitui o <OrganizationProfile/>: toda a
 * marcação é nossa. `isAdmin` reflete o papel do usuário atual na org ativa — a UI
 * esconde as ações de escrita para um advogado (o BE também barra via RequireRole).
 */
export function useOrgMembers() {
  const { isLoaded, organization, membership, memberships, invitations } =
    useOrganization(PARAMS);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = membership?.role === "org:admin";

  // Envolve uma ação de escrita: sinaliza busy, limpa/expõe erro, e no fim
  // revalida o que o caller pedir. Mantém as ações abaixo de 3 linhas cada.
  const run = useCallback(
    async (fn: () => Promise<unknown>, revalidate: () => void) => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        revalidate();
      } catch {
        setError("Não foi possível concluir a ação. Tente novamente.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const invite = useCallback(
    (emailAddress: string, role: OrganizationCustomRoleKey) =>
      run(
        () => organization!.inviteMember({ emailAddress, role }),
        () => void invitations?.revalidate?.(),
      ),
    [organization, invitations, run],
  );

  const revokeInvite = useCallback(
    (inv: NonNullable<NonNullable<typeof invitations>["data"]>[number]) =>
      run(
        () => inv.revoke(),
        () => void invitations?.revalidate?.(),
      ),
    [invitations, run],
  );

  const changeRole = useCallback(
    (
      mem: NonNullable<NonNullable<typeof memberships>["data"]>[number],
      role: OrganizationCustomRoleKey,
    ) =>
      run(
        () => mem.update({ role }),
        () => void memberships?.revalidate?.(),
      ),
    [memberships, run],
  );

  const removeMember = useCallback(
    (mem: NonNullable<NonNullable<typeof memberships>["data"]>[number]) =>
      run(
        () => mem.destroy(),
        () => void memberships?.revalidate?.(),
      ),
    [memberships, run],
  );

  return {
    isLoaded,
    organization,
    isAdmin,
    currentUserId: membership?.publicUserData?.userId,
    memberships,
    invitations,
    busy,
    error,
    invite,
    revokeInvite,
    changeRole,
    removeMember,
  };
}
