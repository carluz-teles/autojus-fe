"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { assignResponsavel } from "../services/processos.service";

/**
 * Atribui/desatribui o responsável do processo (PUT /v1/processos/:id/responsavel).
 * O BE ecoa o ProcessoView fresco; no sucesso invalidamos o detalhe do processo
 * para o header reidratar do dado persistido (nunca do echo do cliente). Retornar
 * a Promise mantém `isPending` ligado até a invalidação concluir. `mutate(userId)`
 * com null = desatribuir.
 */
export function useAssignResponsavel(processoId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string | null) =>
      assignResponsavel(fetcher, processoId, userId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["processos", "detail", processoId],
      }),
  });
}
