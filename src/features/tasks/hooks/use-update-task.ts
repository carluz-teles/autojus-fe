"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { updateTask } from "../services/tasks.service";
import { taskKeys } from "../task-keys";
import type { UpdateTaskInput } from "../types";

/**
 * Mutation de editar tarefa (PATCH /v1/tasks/:id). No sucesso invalida as mesmas
 * queries do create — a edição de título/prazo/responsável reflete na agenda, na
 * aba do processo, nos prazos e na intimação de origem. `await Promise.all`
 * mantém `isPending` ligado até o refetch concluir. Espelha useCreateTask.
 */
export function useUpdateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      updateTask(fetcher, id, patch),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
  };
}
