"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { useEffect } from "react";

// Garante que a sessão tenha uma org ATIVA. Com "Membership optional" o Clerk não
// força org ativa: no refresh o contexto pode voltar pra conta pessoal (orgId
// null), quebrando as telas org-scoped (useOrganization → null) e o Auth strict do
// BE (token sem org_id → 401). Modelo do produto: 1 user = 1 escritório — então se
// há membership e nenhuma org ativa, ativamos a primeira. Não renderiza nada; o
// gating (que confia no /me) NÃO depende disso — aqui é só reidratar a org ativa.
export function EnsureActiveOrg() {
  const { isLoaded: authLoaded, orgId } = useAuth();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!authLoaded || !isLoaded || orgId) return;
    const first = userMemberships.data?.[0];
    if (first) void setActive({ organization: first.organization.id });
  }, [authLoaded, isLoaded, orgId, userMemberships.data, setActive]);

  return null;
}
