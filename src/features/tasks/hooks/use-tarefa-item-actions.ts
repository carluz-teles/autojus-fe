"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  createTaskItem,
  deleteTaskItem,
  patchTaskItem,
} from "../services/tasks.service";
import { taskKeys } from "../task-keys";

/**
 * Ações do checklist de UMA tarefa (alternar/adicionar/remover item). Todas invalidam
 * TODAS as queries de tarefa no sucesso — o detalhe (items + progress + display_status
 * mudam) e a agenda (o display_status derivado pode mudar). `taskId` é fixo (a tela do
 * detalhe); os mutates recebem o id do item / o título. Retornar a Promise mantém
 * `isPending` até a invalidação concluir. Espelha useTaskActions.
 */
export function useTarefaItemActions(taskId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: taskKeys.all });

  const toggle = useMutation({
    mutationFn: ({ itemId, done }: { itemId: string; done: boolean }) =>
      patchTaskItem(fetcher, taskId, itemId, { done }),
    onSuccess: invalidate,
  });

  const add = useMutation({
    mutationFn: (title: string) => createTaskItem(fetcher, taskId, title),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (itemId: string) => deleteTaskItem(fetcher, taskId, itemId),
    onSuccess: invalidate,
  });

  return { toggle, add, remove };
}
