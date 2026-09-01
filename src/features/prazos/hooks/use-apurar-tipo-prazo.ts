"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { apurarTipoPrazo } from "../services/prazos.service";
import type { PrazoApurarTipoInput } from "../types";

/**
 * Mutation da apuração do tipo inferido por IA na memória de cálculo — POST
 * /v1/prazos/:id/apurar-tipo (confirmar ou reclassificar). No sucesso invalida
 * as queries de prazos (o detalhe recarrega com selo "confiavel"). Espelha
 * useNoDeadlinePrazo/useReopenPrazo.
 */
export function useApurarTipoPrazo() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      prazoId,
      body,
    }: {
      prazoId: string;
      body: PrazoApurarTipoInput;
    }) => apurarTipoPrazo(fetcher, prazoId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prazos"] });
    },
  });

  return {
    apurar: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
