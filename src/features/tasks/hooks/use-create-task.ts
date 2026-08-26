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
 *
 * As invalidações são fire-and-forget (não `await`adas): único consumidor hoje é
 * `NovaTarefaModal`, que fecha um `Dialog` (base-ui) logo após `createTaskAsync`
 * resolver. Se a mutation só resolvesse depois do `Promise.all` dos 3 refetches, a
 * rajada de re-renders do restante da página (lista de tarefas/prazos/intimações
 * recarregando) acontecia bem no meio da transição de saída do Dialog e interrompia
 * a detecção de fim de transição do base-ui — o backdrop/painel ficava preso no DOM
 * com opacity:0 e pointer-events:auto, bloqueando clique na página inteira. Deixando
 * a mutation resolver assim que o POST termina, `onFechar()` roda com a árvore calma
 * e o Dialog fecha limpo; as invalidações seguem em background e só causam re-render
 * quando o refetch de rede voltar (bem depois da transição de 200ms já ter acabado).
 */
export function useCreateTask() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(fetcher, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["prazos"] });
      void queryClient.invalidateQueries({ queryKey: ["intimacoes"] });
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
