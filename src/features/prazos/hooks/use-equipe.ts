"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useMe } from "@/features/onboarding/hooks/use-me";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { nomeExibicao, roleLabel } from "@/features/organization/lib/labels";
import { removeOrgMember } from "@/features/organization/services/organization.service";
import { useApi } from "@/lib/api/use-api";

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
  const { members, isPending, error, refetch, isSuccess, dataUpdatedAt } =
    useOrgMembersDirectory();
  const { orgId } = useAuth();
  const { data: me } = useMe();
  const selfId = me?.user_id;
  const fetcher = useApi();
  const qc = useQueryClient();
  const removedKey = useMemo(
    () => ["organization", "removed-members", orgId] as const,
    [orgId],
  );
  const { data: removedSince } = useQuery({
    queryKey: removedKey,
    queryFn: async () => ({}) as Record<string, number>,
    enabled: false,
    initialData: {} as Record<string, number>,
    gcTime: 30 * 60 * 1000,
  });
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const removingRef = useRef(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const visibleRemoved = useMemo(
    () => new Set(Object.keys(removedSince)),
    [removedSince],
  );
  useEffect(() => {
    if (!orgId || !isSuccess || !dataUpdatedAt) return;
    const activeIds = new Set(members.map((member) => member.id));
    const confirmedAbsent = Object.entries(removedSince)
      .filter(([id, since]) => dataUpdatedAt > since && !activeIds.has(id))
      .map(([id]) => id);
    if (confirmedAbsent.length === 0) return;
    qc.setQueryData<Record<string, number>>(removedKey, (previous = {}) => {
      const next = { ...previous };
      for (const id of confirmedAbsent) {
        if (next[id] === removedSince[id]) delete next[id];
      }
      return next;
    });
  }, [orgId, isSuccess, dataUpdatedAt, members, removedSince, qc, removedKey]);
  const confirm = members.find(
    (m) => m.id === confirmId && !visibleRemoved.has(m.id),
  );
  const remove = async () => {
    if (!confirm || !orgId || removingRef.current) return;
    removingRef.current = true;
    setRemovingId(confirm.id);
    setRowError(null);
    try {
      await removeOrgMember(fetcher, confirm.id);
      qc.setQueryData<Record<string, number>>(removedKey, (previous = {}) => ({
        ...previous,
        [confirm.id]: dataUpdatedAt,
      }));
      setConfirmId(null);
      toast.success("Acesso do membro removido.");
      await qc.invalidateQueries({
        queryKey: ["organization", "members", orgId],
      });
    } catch {
      const message = "Não foi possível remover o membro. Tente novamente.";
      setRowError({ id: confirm.id, message });
      toast.error(message);
    } finally {
      removingRef.current = false;
      setRemovingId(null);
    }
  };

  const lista = useMemo(
    () =>
      members
        .filter((m) => !visibleRemoved.has(m.id))
        .map((m) => {
          const nome = nomeExibicao(m.name, m.email);
          return {
            id: m.id,
            ini: iniciais(nome),
            nome,
            email: m.email,
            papel: roleLabel(m.role),
            papelCor: m.role === "ADMIN" ? "var(--primary)" : "var(--fg2)",
            isSelf: !!selfId && m.id === selfId,
            error: rowError?.id === m.id ? rowError.message : null,
            requestRemoval: () => setConfirmId(m.id),
          };
        }),
    [members, visibleRemoved, selfId, rowError],
  );

  return {
    lista,
    isPending,
    error,
    refetch,
    confirm,
    confirmId,
    setConfirmId,
    removingId,
    remove,
    selfKnown: !!selfId,
  };
}
