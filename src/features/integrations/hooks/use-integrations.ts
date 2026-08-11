"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
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

  // 403 FORBIDDEN no POST de ativação: hoje o único motivo é o tenant ter
  // atingido o active_process_limit do plano (gating de entitlements na
  // borda). Mesmo padrão do isConflict em useStartCheckout — troca o erro
  // genérico por uma ação específica (upgrade) em vez de mostrar o erro cru.
  const isForbidden =
    activate.error instanceof ApiError && activate.error.kind === "FORBIDDEN";

  return {
    integrations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    activate: activate.mutateAsync,
    isActivating: activate.isPending,
    activateError: activate.error,
    isForbidden,
  };
}
