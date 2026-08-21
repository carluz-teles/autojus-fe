"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  getIntegrations,
  getWatchedOabs,
  updateIntegrationScope,
} from "../services/integrations.service";
import type { IntegrationScope } from "../types";

export const INTEGRATIONS_KEY = ["acquisition", "integrations"] as const;
export const WATCHED_OABS_KEY = ["acquisition", "watched-oabs"] as const;

/** Lista as integrações do tenant. Sem polling — dados são estáveis na aba de
 * configurações; revalidação acontece via invalidação após mutation. */
export function useIntegrations() {
  const fetcher = useApi();
  return useQuery({
    queryKey: INTEGRATIONS_KEY,
    queryFn: () => getIntegrations(fetcher),
  });
}

/** OABs monitoradas com nome do advogado (GET /v1/acquisition/watched-oabs).
 * Fonte primária da aba Termos: substitui extractDjenOabs para trazer o nome. */
export function useWatchedOabs() {
  const fetcher = useApi();
  return useQuery({
    queryKey: WATCHED_OABS_KEY,
    queryFn: () => getWatchedOabs(fetcher),
  });
}

/** Upsert do scope de integração DJEN. No sucesso invalida a key de integrações
 * para que a lista recarregue com o estado persistido. */
export function useUpdateIntegrationScope() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (scope: IntegrationScope) =>
      updateIntegrationScope(fetcher, scope),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: INTEGRATIONS_KEY }),
        queryClient.invalidateQueries({ queryKey: WATCHED_OABS_KEY }),
      ]);
    },
  });
}
