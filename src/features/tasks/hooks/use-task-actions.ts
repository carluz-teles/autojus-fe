"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { dismissTask, markTaskDone } from "../services/tasks.service";
import { taskKeys } from "../task-keys";

/**
 * Ações da tarefa (concluir / dispensar). Ambas invalidam TODAS as queries de
 * tarefa no sucesso (agenda + aba do processo) — o BE é idempotente, então
 * re-disparar é inofensivo. Espelha useMarkNotifications; `mutate(id)` no botão,
 * `isPending` desabilita os controles do cartão. Retornar a Promise mantém
 * `isPending` ligado até a invalidação concluir.
 */
export function useTaskActions() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: taskKeys.all });

  const markDone = useMutation({
    mutationFn: (id: string) => markTaskDone(fetcher, id),
    onSuccess: invalidate,
  });
  const dismiss = useMutation({
    mutationFn: (id: string) => dismissTask(fetcher, id),
    onSuccess: invalidate,
  });

  return { markDone, dismiss };
}
