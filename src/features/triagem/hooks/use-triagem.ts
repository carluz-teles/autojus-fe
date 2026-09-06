"use client";

import { useMemo } from "react";

import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoWorkStage } from "@/features/intimacoes/types";

import { ordenarPorUrgencia } from "../lib/ordenar";

/** Estágios que ainda não viraram tarefa — a fila de Triagem (decisão do
 *  Architect). Enviados como CSV (`work_stage=A,B,C`) — ver
 *  intimacoes.service.ts. */
export const TRIAGEM_WORK_STAGES: IntimacaoWorkStage[] = [
  "RECEIVED",
  "AWAITING_CONFIRMATION",
  "CONFIRMED",
];

// Página única — sem "mostrar mais" nesta v1. O header mostra `totalCount` (o
// total real do filtro no BE), não `itens.length`: pode haver mais de 100
// intimações a triar, mas a lista só carrega a 1ª leva.
const TRIAGEM_LIMIT = 100;

/** Filtros da Triagem além da fila fixa de estágios: aba de origem + as duas
 *  facetas do design (órgão/tribunal + urgência). Todos server-side. */
export interface TriagemFilters {
  /** Aba de origem (`?origem=`); "" / undefined = "Todos". */
  origem?: string;
  /** Faceta "Órgão" (`?court=`) — tribunal distinto do conjunto. */
  court?: string;
  /** Pill/faceta "Urgência" (`?urgencia=`) — closed set do BE. */
  urgencia?: string;
}

/**
 * Fila de Triagem — intimações que ainda não viraram tarefa, ordenada por
 * urgência. REUSA useIntimacoes (mesmo fetch/cache/paginação por cursor de
 * Intimações) só com work_stage=CSV + limit=100, SEM ?sort= (mantém o default
 * made_available_at DESC do BE); a ordenação por urgência é aplicada aqui,
 * client-side (ver ordenarPorUrgencia).
 *
 * `origem` (aba selecionada) vira `?origem=` — filtro server-side; troca de aba
 * refaz o fetch. `origemFacets` (do envelope, contagens sobre o conjunto inteiro
 * do filtro exceto o próprio origem) alimenta as abas com contagem correta,
 * mesmo com só a 1ª leva (100) carregada. `undefined`/"" = aba "Todos".
 * `court`/`urgencia` são as duas facetas do design (barra Filtrar + pills de
 * urgência) — também server-side. `buckets` (contagens por urgência) alimenta as
 * pills; `filterOptions` (do envelope) traz as opções distintas de tribunal.
 */
export function useTriagem(filters: TriagemFilters = {}) {
  const {
    intimacoes,
    filters: filterOptions,
    buckets,
    totalCount,
    origemFacets,
    isPending,
    isFetching,
    error,
  } = useIntimacoes({
    workStage: TRIAGEM_WORK_STAGES,
    origem: filters.origem,
    court: filters.court,
    urgencia: filters.urgencia,
    limit: TRIAGEM_LIMIT,
  });

  const itens = useMemo(() => ordenarPorUrgencia(intimacoes), [intimacoes]);

  return {
    itens,
    totalCount,
    origemFacets,
    buckets,
    filterOptions,
    isPending,
    isFetching,
    error,
  };
}

/**
 * Só o contador — para o badge da sidebar. Mesma queryKey de useTriagem()
 * (mesmos filtros), então o React Query deduplica o fetch quando a página e a
 * sidebar estão montadas ao mesmo tempo (sem requisição dobrada). undefined
 * enquanto o 1º load não resolveu (a sidebar só mostra o badge com número).
 */
export function useTriagemCount(): number | undefined {
  const { totalCount, isPending } = useIntimacoes({
    workStage: TRIAGEM_WORK_STAGES,
    limit: TRIAGEM_LIMIT,
  });
  return isPending ? undefined : totalCount;
}
