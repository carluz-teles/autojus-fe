"use client";

// Orquestração da tela "Construção de peça" — estados PÓS-partida:
//   • pregen   — saga CREATED e ainda NÃO disparou geração → CTA "Gerar minuta"
//   • gerando  — logo após disparar (flag local) OU saga CREATED/EXTRACTING →
//                a IA "redige" a peça em tempo real (streamed markdown)
//   • pronta   — saga DRAFTED/REVIEWED → editor WYSIWYG + teses inline
//
// O componente chama só este hook público; a lógica (seleção/provenance/disparo
// da geração + derivação do estágio do centro) vive aqui. Compõe os sub-hooks
// _private: useDraft (saga polling), useThesesController (contrato Teses) e
// useGenerateDraft (POST /generate).

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SagaState } from "../types";
import { useDraft } from "./use-draft";
import { useGenerateDraft, useThesesController } from "./use-theses";

/** Estágio do CENTRO da tela — a barra e o rail não mudam entre estágios. */
export type CenterStage = "pregen" | "gerando" | "pronta";

/** Deriva o estágio do centro a partir do saga_state + um flag local de
 *  "acabei de clicar Gerar". O flag existe porque, entre o POST /generate e o
 *  saga entrar em CREATED/EXTRACTING no próximo poll, há uma janela em que o
 *  saga ainda é o anterior — sem o flag, o centro piscaria de volta pro CTA. */
export function deriveStage(
  saga: SagaState | undefined,
  firedGenerate: boolean,
): CenterStage {
  if (saga === "DRAFTED" || saga === "REVIEWED") return "pronta";
  if (saga === "CREATED" || saga === "EXTRACTING" || saga === "FAILED") {
    // CREATED sem ter disparado = peça ainda vazia (pré-geração). CREATED logo
    // após disparar = geração em curso (o worker ainda não avançou o saga).
    if (saga === "CREATED" && !firedGenerate) return "pregen";
    return saga === "FAILED" ? "pronta" : "gerando";
  }
  return firedGenerate ? "gerando" : "pregen";
}

export function useConstruction(id: string) {
  const router = useRouter();
  const draftQuery = useDraft(id);
  const theses = useThesesController(id);
  const generate = useGenerateDraft(id);

  // Provenance: attachment (Fundada em) destacado por "ver fonte" numa tese.
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  // Disparei "Gerar minuta" nesta sessão? Ponte otimista até o saga avançar.
  const [firedGenerate, setFiredGenerate] = useState(false);

  const saga = draftQuery.data?.sagaState;

  // Nota: não precisamos "soltar" firedGenerate quando o saga chega em DRAFTED/
  // REVIEWED — deriveStage já retorna "pronta" por saga, independente do flag.
  // O flag só desempata a janela CREATED (pré-geração vs. logo após disparar).

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
    setFiredGenerate(true);
    generate.mutate(theses.selectedIds, {
      onError: () => setFiredGenerate(false),
    });
  };

  const voltar = () => router.push("/pecas");

  const stage = deriveStage(saga, firedGenerate);

  return {
    draft: draftQuery.data,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    stage,
    theses,
    highlightedDocId,
    focusSource,
    gerarMinuta,
    isGenerating: generate.isPending,
    voltar,
  };
}
