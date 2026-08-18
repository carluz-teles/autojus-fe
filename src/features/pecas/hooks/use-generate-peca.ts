"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { generatePeca } from "../services/pecas.service";

/**
 * Mutation para disparar geração de minuta via IA.
 * POST /v1/pecas/:id/generate → 202 EXTRACTING.
 * onSuccess invalida a query da peça, o que acorda o polling do usePeca
 * (refetchInterval ativo enquanto saga_state==="EXTRACTING").
 *
 * 409 GENERATION_IN_PROGRESS → isConflict=true (caller exibe aviso).
 */
export function useGeneratePeca(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => generatePeca(fetcher, pecaId),
    onSuccess: async () => {
      // Força o refetch imediato; o polling assume a partir daí.
      await queryClient.invalidateQueries({
        queryKey: ["pecas", "detail", pecaId],
      });
    },
  });

  const isConflict =
    mutation.isError &&
    mutation.error instanceof ApiError &&
    mutation.error.kind === "CONFLICT";

  return {
    generate: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isConflict,
    error: mutation.error,
    reset: mutation.reset,
  };
}
