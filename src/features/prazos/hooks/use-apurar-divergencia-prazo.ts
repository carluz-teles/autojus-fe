"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { apurarDivergenciaPrazo } from "../services/prazos.service";
import type { PrazoApurarDivergenciaInput } from "../types";

/**
 * Mutation da apuração de divergência (declarado × calculado) da memória de
 * cálculo — POST /v1/prazos/:id/apurar-divergencia. No sucesso invalida as
 * queries de prazos (o detalhe recarrega com selo "confiavel" + decisão
 * registrada). Espelha useNoDeadlinePrazo/useReopenPrazo.
 */
export function useApurarDivergenciaPrazo() {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      prazoId,
      body,
    }: {
      prazoId: string;
      body: PrazoApurarDivergenciaInput;
    }) => apurarDivergenciaPrazo(fetcher, prazoId, body),
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
