"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  listEsajCredentials,
  revokeEsajCredential,
  uploadEsajCredential,
  type UploadEsajCredentialInput,
} from "../services/esaj-credential.service";
import type { EsajCredentialView } from "../types/esaj-credential";

const QUERY_KEY = ["esaj-credentials"] as const;

/** Lista as credenciais e-SAJ ativas do tenant. */
export function useEsajCredentials() {
  const fetcher = useApi();
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => listEsajCredentials(fetcher),
  });
}

/**
 * Cadastra a credencial e-SAJ do advogado (login + senha + aceite dos termos).
 * A senha é enviada apenas para o BE cifrar no cofre KMS — nunca volta em
 * nenhuma leitura. Em sucesso invalida a lista para reidratar.
 */
export function useUploadEsajCredential() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<EsajCredentialView, Error, UploadEsajCredentialInput>({
    mutationFn: (input) => uploadEsajCredential(fetcher, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

/** Revoga a credencial e-SAJ por id. Em sucesso invalida a lista. */
export function useRevokeEsajCredential() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => revokeEsajCredential(fetcher, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
