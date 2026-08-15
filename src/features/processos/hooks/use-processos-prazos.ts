"use client";

import { useQueries } from "@tanstack/react-query";

import { selectProximoPrazo } from "@/features/prazos/lib/proximo-prazo";
import { listPrazosByProcesso } from "@/features/prazos/services/prazos.service";
import type { PrazoView } from "@/features/prazos/types";
import { useApi } from "@/lib/api/use-api";

/**
 * Ponte cliente (MVP) entre a lista de processos e os prazos: como o BE não
 * entrega prazo na listagem (GET /v1/processos), o hook dispara fetches
 * paralelos (useQueries) para as linhas visíveis e deriva o próximo prazo vivo
 * de cada processo.
 *
 * Query keys `["prazos","list",processoId]` são reutilizáveis pelo cockpit
 * depois (evita dupla-fetch quando a aba abrir).
 *
 * Retorna `Map<processoId, PrazoView | null>` — null significa "sem prazo vivo"
 * (não "não carregado"): para o MVP, linhas ainda não resolvidas mostram "sem
 * prazo" até o backfill do BE.
 */
export function useProcessosPrazos(
  processoIds: string[],
): Map<string, PrazoView | null> {
  const fetcher = useApi();

  const results = useQueries({
    queries: processoIds.map((id) => ({
      queryKey: ["prazos", "list", id] as const,
      queryFn: () =>
        listPrazosByProcesso(fetcher, { processoId: id, limit: 100 }),
      enabled: !!id,
      staleTime: 60_000,
    })),
  });

  const map = new Map<string, PrazoView | null>();
  processoIds.forEach((id, i) => {
    const prazos = results[i]?.data?.data ?? [];
    map.set(id, selectProximoPrazo(prazos));
  });

  return map;
}
