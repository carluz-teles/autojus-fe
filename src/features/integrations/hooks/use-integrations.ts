"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  activateIntegrations,
  listIntegrations,
} from "../services/integrations.service";
import type { ActivateIntegrationInput } from "../types";

const INTEGRATIONS_KEY = ["acquisition", "integrations"] as const;

// Sub-hook privado (não exportado): leitura via React Query — server state, nunca useState.
function useIntegrationsQuery() {
  const fetcher = useApi();
  return useQuery({
    queryKey: INTEGRATIONS_KEY,
    queryFn: () => listIntegrations(fetcher),
  });
}

// Sub-hook privado (não exportado): escrita — invalida a lista ao concluir.
function useActivateMutation() {
  const fetcher = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivateIntegrationInput) =>
      activateIntegrations(fetcher, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: INTEGRATIONS_KEY }),
  });
}

/** Hook público da feature — compõe leitura + escrita; o componente só chama este. */
export function useIntegrations() {
  const query = useIntegrationsQuery();
  const activate = useActivateMutation();

  return {
    integrations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    activate: activate.mutateAsync,
    isActivating: activate.isPending,
    activateError: activate.error,
  };
}
