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

/**
 * Fila de Triagem — intimações que ainda não viraram tarefa, ordenada por
 * urgência. REUSA useIntimacoes (mesmo fetch/cache/paginação por cursor de
 * Intimações) só com work_stage=CSV + limit=100, SEM ?sort= (mantém o default
 * made_available_at DESC do BE); a ordenação por urgência é aplicada aqui,
 * client-side (ver ordenarPorUrgencia).
 */
export function useTriagem() {
  const { intimacoes, totalCount, isPending, isFetching, error } =
    useIntimacoes({
      workStage: TRIAGEM_WORK_STAGES,
      limit: TRIAGEM_LIMIT,
    });

  const itens = useMemo(() => ordenarPorUrgencia(intimacoes), [intimacoes]);

  return { itens, totalCount, isPending, isFetching, error };
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
