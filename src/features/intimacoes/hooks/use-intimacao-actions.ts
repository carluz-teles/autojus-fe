"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import {
  ignoreIntimacao,
  resolveIntimacao,
} from "../services/intimacoes.service";

/**
 * Ações da intimação (resolver / ignorar). Ambas retornam a intimação atualizada
 * (200) e, no sucesso, invalidam TODAS as queries de intimação — lista (o
 * user_status muda de célula) e summary (os contadores mudam). Espelha
 * useTaskActions; `mutate(id)` no item do kebab, `isPending` desabilita os
 * controles. Retornar a Promise mantém `isPending` até a invalidação concluir.
 */
export function useIntimacaoActions() {
  const fetcher = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["intimacoes"] });

  const resolve = useMutation({
    mutationFn: (id: string) => resolveIntimacao(fetcher, id),
    onSuccess: invalidate,
  });
  const ignore = useMutation({
    mutationFn: (id: string) => ignoreIntimacao(fetcher, id),
    onSuccess: invalidate,
  });

  return { resolve, ignore };
}
