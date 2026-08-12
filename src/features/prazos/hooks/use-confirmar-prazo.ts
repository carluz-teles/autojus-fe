"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { confirmarPrazo } from "../services/prazos.service";
import type { PrazoConfirmInput } from "../types";

/**
 * Mutation do "Aprovar tudo". No sucesso invalida tudo o que o confirm mexe:
 * os prazos (o derivado vira OPEN e some do "a confirmar"), as tarefas (N novas)
 * e a intimação de origem. `await Promise.all` garante o refetch antes de concluir
 * — o painel troca sozinho para o cartão confirmado. Espelha useStartCheckout.
 */
export function useConfirmarPrazo() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: PrazoConfirmInput) => confirmarPrazo(fetcher, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["prazos"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["intimacoes"] }),
      ]);
    },
  });

  return {
    confirmar: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
