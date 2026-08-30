"use client";

// Orquestração da tela "Construção de peça" — estado PRÉ-GERAÇÃO (antes de
// "Gerar minuta"). Compõe: draft (contexto do processo/intimação/partes/anexos),
// teses (contrato Teses) e a ação de gerar a minuta. O componente chama só este
// hook público; toda a lógica (seleção de teses, provenance highlight, disparo
// da geração) vive aqui.

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDraft } from "./use-draft";
import { useGenerateDraft, useThesesController } from "./use-theses";

export function usePreGeneration(id: string) {
  const router = useRouter();
  const draftQuery = useDraft(id);
  const theses = useThesesController(id);
  const generate = useGenerateDraft(id);

  // Provenance: qual attachment (Fundada em) está destacado por um clique em
  // "ver fonte" numa tese. UI local efêmera → useState (não é server state).
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);

  const focusSource = (sourceDocumentId: string) => {
    setHighlightedDocId(sourceDocumentId);
    if (typeof document !== "undefined") {
      document
        .getElementById(`fundada-em-${sourceDocumentId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const gerarMinuta = () => {
    if (generate.isPending) return;
    generate.mutate(theses.selectedIds);
  };

  const voltar = () => router.push("/pecas");

  return {
    draft: draftQuery.data,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    theses,
    highlightedDocId,
    focusSource,
    gerarMinuta,
    isGenerating: generate.isPending,
    voltar,
  };
}
