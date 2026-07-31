"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

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

// Sub-hook privado (não exportado): lookups sob demanda (blur), não são cache-first.
function useLookups() {
  const fetcher = useApi();
  return {
    lookupCnpj: useCallback(
      (cnpj: string) => lookupCnpj(fetcher, cnpj),
      [fetcher],
    ),
    lookupCep: useCallback((cep: string) => lookupCep(fetcher, cep), [fetcher]),
  };
}

/**
 * Hook público da feature — compõe /identity/me + escrita do perfil + lookups.
 * `poll` habilita o polling que se auto-desliga em useMe (usado durante o
 * "preparando sua conta" do passo 2).
 */
export function useOnboarding({ poll = false } = {}) {
  const me = useMe(poll);
  const profile = useUpdateOrgProfile();
  const { lookupCnpj: fetchCnpj, lookupCep: fetchCep } = useLookups();

  return {
    me: me.data,
    tenantReady: me.data?.tenant_id != null,
    updateOrgProfile: profile.mutateAsync,
    isSavingProfile: profile.isPending,
    profileError: profile.error,
    lookupCnpj: fetchCnpj,
    lookupCep: fetchCep,
  };
}
