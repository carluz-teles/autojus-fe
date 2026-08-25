"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { updateTask } from "../services/tasks.service";
import type { UpdateTaskInput } from "../types";
import { tasksKeys } from "./use-tasks";

/**
 * Mutation de editar uma tarefa (PATCH /v1/tasks/:id). Ajuste parcial: `updateTask({ id, patch })`.
 * No sucesso invalida as mesmas queries do create — a edição de título/prazo/responsável reflete
 * na agenda, na aba do processo, nos prazos e na intimação de origem. `await Promise.all` mantém
 * `isPending` ligado até o refetch concluir. Espelha useCreateTask.
 */
export function useUpdateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      updateTask(fetcher, id, patch),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    updateTask: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
