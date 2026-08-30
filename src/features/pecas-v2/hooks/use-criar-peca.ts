"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useApi } from "@/lib/api/use-api";

import { createDraft } from "../services/pecas-v2.service";

/**
 * Entry point da peça a partir de uma intimação: cria (ou reaproveita) o draft
 * via POST /v1/pecas {source:intimation} e navega pra tela de Construção. As
 * teses NÃO nascem aqui — são geradas na Construção, escopadas à intimação.
 */
export function useCriarPecaDaIntimacao() {
  const fetcher = useApi();
  const router = useRouter();

  const mut = useMutation({
    mutationFn: (intimacaoId: string) =>
      createDraft(fetcher, { intimationId: intimacaoId }),
    onSuccess: ({ id }) => router.push(`/pecas/${id}`),
    onError: () =>
      toast.error("Não foi possível iniciar a peça. Tente novamente."),
  });

  return {
    gerarPeca: (intimacaoId: string) => mut.mutate(intimacaoId),
    gerandoPeca: mut.isPending,
  };
}
