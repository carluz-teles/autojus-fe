"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { removeOrgMember } from "../services/organization.service";
import { ORG_MEMBERS_KEY } from "./use-org-members-directory";

/**
 * Remoção de um membro ATIVO — único caminho é o BE (ver comentário em
 * use-org-members.ts). Invalida o diretório (useOrgMembersDirectory) no sucesso
 * para a lista da aba Organização refletir a saída.
 */
export function useRemoveOrgMember() {
  const fetcher = useApi();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => removeOrgMember(fetcher, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ORG_MEMBERS_KEY }),
  });

  return {
    removeMember: mutation.mutateAsync,
    isRemoving: mutation.isPending,
    removeError: mutation.error,
  };
}
