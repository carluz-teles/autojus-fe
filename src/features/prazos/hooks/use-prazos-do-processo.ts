"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listPrazosByProcesso } from "../services/prazos.service";
import type { PrazoStatus, PrazoView } from "../types";

// Prazos que ainda correm — candidatos ao herói "próximo prazo" e à lista principal.
const LIVE_STATUS: ReadonlySet<PrazoStatus> = new Set<PrazoStatus>([
  "OPEN",
  "PENDING",
]);

const isLive = (p: PrazoView) => LIVE_STATUS.has(p.status);

/**
 * Herói do topo: o prazo vivo (OPEN/PENDING) de menor days_left. Cálculo fica no
 * hook, nunca no componente (CLAUDE.md). null quando não há prazo em aberto.
 */
function selectProximoPrazo(live: PrazoView[]): PrazoView | null {
  if (live.length === 0) return null;
  return live.reduce((menor, p) => (p.days_left < menor.days_left ? p : menor));
}

/**
 * Hook público da aba de prazos do processo — leitura via React Query e derivação
 * do "próximo prazo". Sem paginação (o drawer mostra o conjunto do processo).
 *
 * Separa VIVOS (OPEN/PENDING) do HISTÓRICO (MISSED/MET/CANCELLED): o backfill de
 * anos de intimações históricas gera dezenas de prazos já vencidos (MISSED) por
 * processo — mostrá-los junto dos vivos poluía a aba (o que parecia "prazo órfão").
 * A lista principal mostra os vivos; o histórico vai recolhido no componente.
 */
export function usePrazosDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["prazos", "processo", processoId],
    queryFn: () => listPrazosByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
  });

  const prazos = query.data?.data ?? [];
  const live = prazos.filter(isLive);
  const historico = prazos.filter((p) => !isLive(p));
  const proximoPrazo = selectProximoPrazo(live);
  // Vivos que não são o herói (o herói já aparece em destaque no topo).
  const liveRestantes = proximoPrazo
    ? live.filter((p) => p.id !== proximoPrazo.id)
    : live;

  return {
    // Lista completa (todos os status) — consumida pelo cockpit (risco/providência/
    // intimações sem prazo). A aba de prazos usa a separação vivos × histórico abaixo.
    prazos,
    proximoPrazo,
    liveRestantes,
    historico,
    isEmpty: prazos.length === 0,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
