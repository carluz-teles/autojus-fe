"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useApi } from "@/lib/api/use-api";

import { nomeExibicao } from "../lib/labels";
import { listOrgMembers } from "../services/organization.service";
import type { OrgMemberView } from "../types";

/**
 * Diretório dos membros do escritório (GET /v1/organization/members) para resolver
 * o nome de um id interno (assignee_user_id) na UI. Separa-se do useOrgMembers
 * (que fala com o Clerk para o painel de time) — aqui a fonte é o BE, via apiFetch,
 * e a saída é um resolvedor `nameFor(id)` memoizado. O time é pequeno; sem cursor.
 */
export const ORG_MEMBERS_KEY = ["organization", "members"] as const;

export function useOrgMembersDirectory() {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ORG_MEMBERS_KEY,
    queryFn: () => listOrgMembers(fetcher),
    staleTime: 5 * 60 * 1000,
  });

  const byId = useMemo(() => {
    const map = new Map<string, OrgMemberView>();
    for (const m of query.data ?? []) map.set(m.id, m);
    return map;
  }, [query.data]);

  return {
    members: query.data ?? [],
    isPending: query.isPending,
    error: query.error,
    /** Rótulo do membro pelo id interno: nome, ou o e-mail (parte local) quando
     *  o nome está vazio — via `nomeExibicao`. null quando desconhecido/ausente. */
    nameFor: (id: string | undefined | null): string | null => {
      const m = id ? byId.get(id) : undefined;
      return m ? nomeExibicao(m.name, m.email) || null : null;
    },
  };
}
