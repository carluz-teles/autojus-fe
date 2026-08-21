"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  dismissTask,
  listTasks,
  markTaskDone,
} from "../services/tasks.service";
import type { TaskView } from "../types";

/**
 * Tarefas vinculadas a uma intimação — GET /v1/tasks?intimation_id=:id.
 * Desligado enquanto `intimationId` é nulo/vazio (enabled: !!intimationId).
 */
export function useTasksDaIntimacao(intimationId: string | null) {
  const fetcher = useApi();

  const query = useQuery({
    queryKey: ["tasks", "por-intimacao", intimationId],
    queryFn: () =>
      listTasks(fetcher, { intimation_id: intimationId as string, limit: 100 }),
    enabled: !!intimationId,
    select: (data) => data.data,
  });

  return {
    tasks: query.data ?? ([] as TaskView[]),
    isPending: query.isPending && !!intimationId,
    isError: query.isError,
    error: query.error,
  };
}

/** Conclui uma tarefa (POST /v1/tasks/:id/done) e invalida tasks + intimações. */
export function useConcluirTask() {
  const fetcher = useApi();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markTaskDone(fetcher, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });
}

/** Dispensa uma tarefa (POST /v1/tasks/:id/dismiss) e invalida tasks + intimações. */
export function useDescartarTask() {
  const fetcher = useApi();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dismissTask(fetcher, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tasks"] }),
        qc.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });
}
