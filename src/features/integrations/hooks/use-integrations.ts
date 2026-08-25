"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  addWatchedOab,
  getIntegrations,
  getWatchedOabs,
  toggleWatchedOab,
} from "../services/integrations.service";

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

/** Adiciona 1 OAB ao monitoramento (POST /v1/acquisition/watched-oabs). No
 * sucesso invalida a lista para refletir a nova inscrição (nasce habilitada). */
export function useAddWatchedOab() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (oab: string) => addWatchedOab(fetcher, oab),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WATCHED_OABS_KEY });
    },
  });
}

/** Liga/desliga a captura de 1 OAB (PATCH /v1/acquisition/watched-oabs/:oab).
 * Ligar dispara catch-up no BE; só invalida a lista no sucesso. */
export function useToggleWatchedOab() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oab, enabled }: { oab: string; enabled: boolean }) =>
      toggleWatchedOab(fetcher, oab, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WATCHED_OABS_KEY });
    },
  });
}
