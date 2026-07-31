"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useApi } from "@/lib/api/use-api";

import {
  lookupCep,
  lookupCnpj,
  syncIdentity,
  updateOrgProfile,
} from "../services/onboarding.service";
import type { Me, OrgProfileInput, SyncIdentityInput } from "../types";
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

// Sub-hook privado (não exportado): provisionamento JIT síncrono do passo 2. Semeia
// o cache do /identity/me com o Me retornado — `tenant_id` já preenchido — em vez de
// invalidar e pollar: o tenant volta na MESMA resposta, sem corrida com o webhook.
function useSyncIdentity() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SyncIdentityInput) => syncIdentity(fetcher, input),
    onSuccess: (me: Me) => qc.setQueryData(ME_KEY, me),
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
  const sync = useSyncIdentity();
  const { lookupCnpj: fetchCnpj, lookupCep: fetchCep } = useLookups();

  return {
    me: me.data,
    tenantReady: me.data?.tenant_id != null,
    syncIdentity: sync.mutateAsync,
    isSyncing: sync.isPending,
    syncError: sync.error,
    updateOrgProfile: profile.mutateAsync,
    isSavingProfile: profile.isPending,
    profileError: profile.error,
    lookupCnpj: fetchCnpj,
    lookupCep: fetchCep,
  };
}
