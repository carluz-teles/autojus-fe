"use client";

import { useMemo } from "react";

import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao, roleLabel } from "@/features/organization/lib/labels";

// Iniciais do avatar a partir do nome de exibição (1ª+última palavra). Fonte
// única do cálculo — o componente só faz binding.
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Membros ATIVOS do escritório prontos pra exibição na aba Equipe. Fonte = BE
 * (GET /v1/organization/members, via useOrgMembersDirectory) — os pendentes
 * (Clerk) vivem no useInvite. Mapeia role→rótulo pt-BR + cor.
 */
export function useEquipe() {
  const { members, isPending, error } = useOrgMembersDirectory();

  const lista = useMemo(
    () =>
      members.map((m) => {
        const nome = nomeExibicao(m.name, m.email);
        return {
          id: m.id,
          ini: iniciais(nome),
          nome,
          email: m.email,
          papel: roleLabel(m.role),
          papelCor: m.role === "ADMIN" ? "var(--primary)" : "var(--fg2)",
        };
      }),
    [members],
  );

  return { lista, isPending, error };
}
