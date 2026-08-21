"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { noDeadlinePrazo } from "../services/prazos.service";

/**
 * Mutation para declarar mera ciência (POST /v1/prazos/:id/no-deadline).
 * No sucesso invalida todas as queries de prazos e intimações — o painel
 * transiciona automaticamente para o estado "no_deadline".
 */
export function useNoDeadlinePrazo() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (prazoId: string) => noDeadlinePrazo(fetcher, prazoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    declarar: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
