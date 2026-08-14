"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { updateTask } from "../services/tasks.service";
import type { UpdateTaskInput } from "../types";

/**
 * Mutation de editar uma tarefa (PATCH /v1/tasks/:id). Ajuste parcial: `mutate({ id, patch })`.
 * No sucesso invalida as tarefas (título/vencimento/assignee mudam na agenda + no detalhe) e os
 * prazos (o painel do prazo mostra suas tarefas). `await Promise.all` mantém `isPending` ligado
 * até o refetch concluir. Espelha useConfirmarPrazo (mesma dupla de query keys).
 */
export function useUpdateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      updateTask(fetcher, id, patch),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
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
