"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { createTask } from "../services/tasks.service";
import { taskKeys } from "../task-keys";
import type { CreateTaskInput } from "../types";

/**
 * Mutation de criar tarefa (POST /v1/tasks). No sucesso invalida tudo o que uma
 * task nova pode tocar: as tarefas (agenda + aba do processo), os prazos (a task
 * nasce de um deadline) e a intimação de origem. `await Promise.all` mantém
 * `isPending` ligado até o refetch concluir. Espelha useConfirmarPrazo.
 */
export function useCreateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(fetcher, input),
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
