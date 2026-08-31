"use client";

import { useRouter } from "next/navigation";

/**
 * Entry point da peça a partir de uma intimação.
 *
 * NÃO cria draft aqui — a peça só EXISTE quando o advogado clica "Gerar minuta"
 * na tela de Construção. Aqui apenas abrimos a Construção em modo PARTIDA
 * (efêmero), escopada à intimação via query param. O draft é materializado no
 * "Gerar minuta" (POST /v1/pecas com as teses selecionadas), e só então a URL
 * vira /pecas/[draftId].
 */
export function useCriarPecaDaIntimacao() {
  const router = useRouter();

  return {
    abrirConstrucao: (intimacaoId: string) =>
      router.push(`/pecas/nova?intimacao=${intimacaoId}`),
  };
}
