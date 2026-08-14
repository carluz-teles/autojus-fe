"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getSuggestedTasks } from "../services/prazos.service";

/**
 * Sub-hook `_private`: busca as tarefas sugeridas por LLM para um prazo (on-demand — só
 * dispara quando o F2 abre, então só custa quando o advogado vai confirmar). Cache longo
 * (a sugestão do mesmo prazo não muda na sessão) e SEM retry no cliente: o adapter do BE
 * já lida com o 429 transiente do provider; se falhar, o form segue com tarefas vazias.
 */
export function useTarefasSugeridas(prazoId: string) {
  const fetcher = useApi();

  return useQuery({
    queryKey: ["prazos", "suggested-tasks", prazoId],
    queryFn: () => getSuggestedTasks(fetcher, prazoId),
    enabled: !!prazoId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
