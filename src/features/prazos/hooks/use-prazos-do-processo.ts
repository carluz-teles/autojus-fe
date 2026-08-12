"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listPrazosByProcesso } from "../services/prazos.service";
import type { PrazoStatus, PrazoView } from "../types";

// Prazos que ainda correm — candidatos ao herói "próximo prazo".
const LIVE_STATUS: ReadonlySet<PrazoStatus> = new Set<PrazoStatus>([
  "OPEN",
  "PENDING",
]);

/**
 * Herói do topo: o prazo vivo (OPEN/PENDING) de menor days_left. Cálculo fica no
 * hook, nunca no componente (CLAUDE.md). null quando não há prazo em aberto.
 */
function selectProximoPrazo(prazos: PrazoView[]): PrazoView | null {
  const live = prazos.filter((p) => LIVE_STATUS.has(p.status));
  if (live.length === 0) return null;
  return live.reduce((menor, p) => (p.days_left < menor.days_left ? p : menor));
}

/**
 * Hook público da aba de prazos do processo — leitura via React Query e derivação
 * do "próximo prazo". Sem paginação (o drawer mostra o conjunto do processo).
 */
export function usePrazosDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["prazos", "processo", processoId],
    queryFn: () => listPrazosByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
  });

  const prazos = query.data?.data ?? [];

  return {
    prazos,
    proximoPrazo: selectProximoPrazo(prazos),
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
