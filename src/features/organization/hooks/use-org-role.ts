"use client";

import { useOrganization } from "@clerk/nextjs";

/**
 * Papel do usuário na organização (tenant) ativa. É checagem de UX apenas — o
 * BE já garante via RequireRole(ADMIN); isso só evita oferecer uma ação (ex.
 * billing) que a API recusaria com 403.
 */
export function useIsOrgAdmin() {
  const { isLoaded, membership } = useOrganization();
  return { isLoaded, isAdmin: membership?.role === "org:admin" };
}
