"use client";

import { useMutation } from "@tanstack/react-query";

import { useApi } from "@/lib/api/use-api";

import { createPeca } from "../services/pecas.service";
import type { CreatePecaInput } from "../types";

/**
 * Mutation de criar peça (POST /v1/pecas). Idempotente por intimation_id:
 * 201 = criada agora, 200 = já existia. Em ambos os casos o chamador navega
 * para /pecas/{data.id}. Sem invalidação de cache — a navegação carrega o
 * detalhe via usePeca.
 */
export function useCreatePeca() {
  const fetcher = useApi();

  const mutation = useMutation({
    mutationFn: (input: CreatePecaInput) => createPeca(fetcher, input),
  });

  return {
    createPeca: mutation.mutate,
    createPecaAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
