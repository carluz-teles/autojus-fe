"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { listTasksByProcesso } from "../services/tasks.service";
import { taskKeys } from "../task-keys";

/**
 * Hook público das tarefas do processo — leitura via React Query. Sem paginação
 * (o drawer mostra o conjunto do processo, como usePrazosDoProcesso).
 */
export function useTasksDoProcesso(processoId: string) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: taskKeys.processo(processoId),
    queryFn: () => listTasksByProcesso(fetcher, { processoId, limit: 100 }),
    enabled: !!processoId,
  });

  return {
    tasks: query.data?.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
