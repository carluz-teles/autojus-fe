"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getPortalCredential,
  removePortalCredential,
  savePortalCredential,
} from "../services/portal-credentials.service";
import type { SavePortalCredentialInput } from "../types";

const PORTAL_CREDENTIAL_KEY = [
  "integrations",
  "portal-credentials",
  "tjsp-eproc",
] as const;

// Sub-hook privado: leitura via React Query. 404 já vira `null` no service —
// aqui é sempre um sucesso (data: PortalCredential | null), nunca isError.
function usePortalCredentialQuery() {
  const fetcher = useApi();
  return useQuery({
    queryKey: PORTAL_CREDENTIAL_KEY,
    queryFn: () => getPortalCredential(fetcher),
  });
}

// Sub-hook privado: PUT salva (cria ou reconfigura) — sempre a mesma mutation,
// o BE decide upsert. Invalida a leitura ao concluir, sucesso ou "pendente".
function useSaveMutation() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SavePortalCredentialInput) =>
      savePortalCredential(fetcher, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PORTAL_CREDENTIAL_KEY }),
  });
}

// Sub-hook privado: remoção — invalida a leitura (o card volta a "Não configurada").
function useRemoveMutation() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => removePortalCredential(fetcher),
    onSuccess: () => qc.invalidateQueries({ queryKey: PORTAL_CREDENTIAL_KEY }),
  });
}

/** Hook público da feature — compõe leitura + escrita; o componente só chama este. */
export function usePortalCredential() {
  const query = usePortalCredentialQuery();
  const save = useSaveMutation();
  const remove = useRemoveMutation();

  return {
    credential: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    save: save.mutateAsync,
    isSaving: save.isPending,
    saveError: save.error,
    /** Último resultado bem-sucedido do PUT (ACTIVE ou pendente) — nulo até o
     * primeiro submit da sessão atual do Sheet; `resetSave` limpa junto com o erro. */
    saveResult: save.data ?? null,
    /** Limpa erro E resultado da mutation de uma vez (ex.: ao reabrir o Sheet). */
    resetSave: save.reset,
    remove: remove.mutateAsync,
    isRemoving: remove.isPending,
    removeError: remove.error,
  };
}
