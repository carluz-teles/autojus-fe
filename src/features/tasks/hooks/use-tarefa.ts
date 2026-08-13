"use client";

import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { getTask } from "../services/tasks.service";
import { taskKeys } from "../task-keys";

/**
 * Detalhe individual da tarefa (GET /v1/tasks/:id) — campos da tarefa + checklist,
 * progresso e display_status. Desligado enquanto `id` for null (dependent query do
 * React Query v5: enabled: !!id). Espelha usePrazo/useIntimacao.
 */
export function useTarefa(id: string | null) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: taskKeys.detail(id ?? ""),
    queryFn: () => getTask(fetcher, id as string),
    enabled: !!id,
  });

  return {
    tarefa: query.data ?? null,
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  };
}
