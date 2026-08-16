"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getProcessoResumo } from "../services/processos.service";

/**
 * Sub-hook `_private` do cockpit: busca o resumo do processo por IA (GET
 * /v1/processos/:id/resume). O BE é write-once sync-on-first-GET — a primeira
 * abertura gera (LLM) e persiste, as seguintes servem do cache — então o cache
 * longo cobre a sessão e SEM retry automático no cliente: o degrade determinístico
 * do BE (summary "") cobre o caso de provider indisponível, e a aba segue
 * renderizável com os blocos derivados. Desligado enquanto `processoId` for vazio.
 * `refetch` é exposto para o botão de retry do estado de erro.
 */
export function useProcessoResumo(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["processos", "resume", processoId],
    queryFn: () => getProcessoResumo(fetcher, processoId),
    enabled: !!processoId,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });

  return { ...query, refetch: query.refetch };
}
