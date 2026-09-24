"use client";

import { usePipelineCounts } from "@/features/intimacoes/hooks/use-intimacoes";

// Badge do item de nav "Mesa de Trabalho" — mesma fonte única de contagem do
// pipeline (usePipelineCounts) que a própria tela usa para a aba "A decidir",
// sem filtros de responsável/busca (o nav mostra o volume total do escritório).
export function useTriagemCount(): number | undefined {
  const pipeline = usePipelineCounts();
  return pipeline.isPending ? undefined : pipeline.counts.a_triar;
}
