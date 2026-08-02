"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  lookupCep,
  lookupCnpj,
  updateOrgProfile,
} from "../services/onboarding.service";
import type { OrgProfileInput } from "../types";
import { ME_KEY, useMe } from "./use-me";

// Sub-hook privado (não exportado): escrita do perfil da org — invalida /identity/me.
function useUpdateOrgProfile() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrgProfileInput) => updateOrgProfile(fetcher, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });
}

// Sub-hook privado (não exportado): lookups sob demanda (blur). São mutations —
// fetch imperativo disparado por evento, não estado de servidor cacheável — e é o
// React Query quem carrega o estado (isPending/isError), não useState na mão.
function useLookups() {
  const fetcher = useApi();
  const cnpj = useMutation({
    mutationFn: (value: string) => lookupCnpj(fetcher, value),
  });
  const cep = useMutation({
    mutationFn: (value: string) => lookupCep(fetcher, value),
  });
  return { cnpj, cep };
}

/**
 * Hook público da feature — compõe /identity/me + escrita do perfil + lookups.
 * `poll` habilita o polling que se auto-desliga em useMe (usado durante o
 * "preparando sua conta" do passo da empresa).
 */
export function useOnboarding({ poll = false } = {}) {
  const me = useMe(poll);
  const profile = useUpdateOrgProfile();
  const { cnpj, cep } = useLookups();

  return {
    me: me.data,
    tenantReady: me.data?.tenant_id != null,
    updateOrgProfile: profile.mutateAsync,
    isSavingProfile: profile.isPending,
    profileError: profile.error,
    lookupCnpj: cnpj.mutateAsync,
    isCnpjLoading: cnpj.isPending,
    cnpjLookupFailed: cnpj.isError,
    lookupCep: cep.mutateAsync,
    isCepLoading: cep.isPending,
  };
}
