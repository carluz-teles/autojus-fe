"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { reopenPrazo } from "../services/prazos.service";

/**
 * Mutation para reabrir um prazo declarado como mera ciência
 * (POST /v1/prazos/:id/reopen). No sucesso invalida prazos e intimações,
 * retornando ao estado "pending".
 */
export function useReopenPrazo() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (prazoId: string) => reopenPrazo(fetcher, prazoId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    reabrir: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
