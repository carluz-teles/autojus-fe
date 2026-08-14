"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { createTask } from "../services/tasks.service";
import type { CreateTaskInput } from "../types";

/**
 * Mutation de criar tarefa manual (POST /v1/tasks). No sucesso invalida as tarefas (a
 * nova entra na agenda / na aba do processo) e os prazos (uma tarefa avulsa ligada a um
 * deadline muda o "por quê" do painel). `await Promise.all` mantém `isPending` ligado até
 * o refetch concluir. Espelha useConfirmarPrazo (mesma dupla de query keys).
 */
export function useCreateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(fetcher, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
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
