"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api/errors";
import { useApi } from "@/lib/api/use-api";

import { reviewPeca } from "../services/pecas.service";

/**
 * Mutation para disparar revisão síncrona da minuta via IA.
 * POST /v1/pecas/:id/review → 200 { data: { review, saga_state: "REVIEWED" } }
 * onSuccess invalida a query da peça; o GET retorna saga_state=REVIEWED + review
 * preenchido, e o painel de sugestões renderiza automaticamente.
 *
 * 409 CONFLICT → isConflict=true (geração em andamento — aguardar).
 * 400 DOMAIN_ERROR_INVALID (→VALIDATION no errors.ts) → isValidation=true
 *   (content vazio ou IA não configurada).
 */
export function useReviewPeca(pecaId: string) {
  const fetcher = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => reviewPeca(fetcher, pecaId),
    onSuccess: async () => {
      // Invalida o detalhe para trazer saga_state=REVIEWED + review do servidor.
      await queryClient.invalidateQueries({
        queryKey: ["pecas", "detail", pecaId],
      });
    },
  });

  const isConflict =
    mutation.isError &&
    mutation.error instanceof ApiError &&
    mutation.error.kind === "CONFLICT";

  const isValidation =
    mutation.isError &&
    mutation.error instanceof ApiError &&
    mutation.error.kind === "VALIDATION";

  return {
    review: mutation.mutate,
    isPending: mutation.isPending,
    isError: mutation.isError,
    isConflict,
    isValidation,
    error: mutation.error,
    reset: mutation.reset,
  };
}
