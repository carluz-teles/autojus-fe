"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { createTask } from "../services/tasks.service";
import type { CreateTaskInput } from "../types";
import { tasksKeys } from "./use-tasks";

/**
 * Mutation de criar tarefa manual (POST /v1/tasks). No sucesso invalida tudo o que uma
 * task nova pode tocar: as tarefas (agenda + aba do processo), os prazos (uma tarefa
 * avulsa ligada a um deadline muda o "por quê" do painel) e a intimação de origem.
 * `await Promise.all` mantém `isPending` ligado até o refetch concluir. Espelha
 * useConfirmarPrazo.
 */
export function useCreateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(fetcher, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tasksKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    createTask: mutation.mutate,
    createTaskAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
