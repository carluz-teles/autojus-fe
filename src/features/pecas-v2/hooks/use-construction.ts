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

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";
import { htmlToText } from "@/lib/html/html-to-text";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";

import type { SagaState } from "../types";
import { useDraft } from "./use-draft";
import { useGenerationPreparation } from "./use-generation-preparation";
import { useGenerateDraft, useThesesController } from "./use-theses";

/** Estágio do CENTRO da tela — a barra e o rail não mudam entre estágios. */
export type CenterStage = "pregen" | "gerando" | "pronta" | "falha";

/** Deriva o estágio do centro a partir do saga_state + um flag local de
 *  "acabei de clicar Gerar". O flag existe porque, entre o POST /generate e o
 *  saga entrar em CREATED/EXTRACTING no próximo poll, há uma janela em que o
 *  saga ainda é o anterior — sem o flag, o centro piscaria de volta pro CTA. */
export function deriveStage(
  saga: SagaState | undefined,
  firedGenerate: boolean,
  hasContent = false,
): CenterStage {
  if (saga === "DRAFTED" || saga === "REVIEWED") return "pronta";
  if (saga === "CREATED" || saga === "EXTRACTING" || saga === "FAILED") {
    if (saga === "FAILED") return "falha";
    // REGERAÇÃO de uma peça que JÁ tem conteúdo (mudou o conjunto de teses):
    // permanece na tela PRONTA e streama o novo texto DENTRO da folha — nada do
    // shell (rails, toolbar, assistente) some. O estágio "gerando" (centro cheio)
    // fica só pra 1ª geração, quando ainda não há folha nenhuma.
    if (hasContent) return "pronta";
    // CREATED sem ter disparado = peça ainda vazia (pré-geração). CREATED logo
    // após disparar = geração em curso (o worker ainda não avançou o saga).
    if (saga === "CREATED" && !firedGenerate) return "pregen";
    return "gerando";
  }
  return firedGenerate ? "gerando" : "pregen";
}

export function useConstruction(id: string) {
  const router = useRouter();
  const params = useSearchParams();
  const draftQuery = useDraft(id);
  const hasOrigin = !!draftQuery.data?.intimation.id;
  const hasTeor = !!htmlToText(draftQuery.data?.intimation.teor || "").trim();
  const theses = useThesesController(id, hasOrigin && hasTeor);
  const generate = useGenerateDraft(id);

  // Auto (documento dos autos) aberto no drawer: o viewer embute o PDF original
  // (busca os bytes por conta própria via /documentos/:id/raw). Guardamos só a
  // identificação do doc + os rótulos do cabeçalho. null = drawer fechado.
  const [autoDrawer, setAutoDrawer] = useState<{
    id: string;
    titulo: string;
    meta: string;
    initialPage?: number;
  } | null>(null);

  // Provenance: attachment (Fundada em) destacado por "ver fonte" numa tese.
  const [highlightedDocId, setHighlightedDocId] = useState<string | null>(null);
  // Disparei "Gerar minuta" nesta sessão? Ponte otimista até o saga avançar.
  const [firedGenerate, setFiredGenerate] = useState(false);
  const [instructionsEdit, setInstructionsEdit] = useState<string | null>(null);
  const instructions = instructionsEdit ?? draftQuery.data?.instructions ?? "";

  const saga = draftQuery.data?.sagaState;
  const generated = saga === "DRAFTED" || saga === "REVIEWED";
  useAIExperience(
    `/v1/pecas/${id}/generate`,
    generated,
    "complete",
    draftQuery.dataUpdatedAt,
  );
  useAIExperience(
    `/v1/pecas/${id}/generate`,
    saga === "FAILED",
    "error",
    draftQuery.dataUpdatedAt,
  );

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

  // Abre o PDF original de um auto num drawer com viewer embutido (fiel ao
  // documento — sem texto reconstruído). O viewer busca os bytes sob demanda.
  const verAuto = (doc: {
    id: string;
    name: string;
    meta: string;
    initialPage?: number;
  }) => {
    setAutoDrawer({
      id: doc.id,
      titulo: doc.name,
      meta: doc.meta,
      initialPage: doc.initialPage,
    });
  };

  const fecharAuto = () => setAutoDrawer(null);

  const regenerateWithTheses = async (
    thesisIds: string[],
    revision: string,
  ) => {
    if (!hasOrigin || !hasTeor || generate.isPending || saga === "EXTRACTING")
      throw new Error("Geração indisponível");
    setFiredGenerate(true);
    try {
      await generate.mutateAsync({ thesisIds, revision });
    } catch (error) {
      setFiredGenerate(false);
      throw error;
    }
  };

  const gerarMinuta = () => {
    if (
      !hasOrigin ||
      !hasTeor ||
      generate.isPending ||
      theses.isLoading ||
      theses.isRegenerating ||
      theses.isTogglingId ||
      theses.isError
    )
      return;
    setFiredGenerate(true);
    generate.mutate(
      { thesisIds: theses.selectedIds, instructions: instructions.trim() },
      {
        onError: () => setFiredGenerate(false),
      },
    );
  };

  const voltar = () =>
    router.push(
      params.get("retorno")?.startsWith("/providencias/")
        ? params.get("retorno")!
        : draftQuery.data?.intimation.id
          ? detalheNaFila(
              draftQuery.data.intimation.id,
              params.get("retorno") ?? "/intimacoes",
            )
          : "/fila",
    );

  const hasContent =
    !!draftQuery.data?.contentHtml && draftQuery.data.contentHtml.trim() !== "";
  const stage = deriveStage(saga, firedGenerate, hasContent);
  // Regeração em curso: a peça já tinha folha e o saga voltou a EXTRACTING/CREATED.
  // O centro fica em "pronta" e a folha streama o novo conteúdo.
  const regenerating =
    stage === "pronta" &&
    (saga === "EXTRACTING" || (saga === "CREATED" && firedGenerate));

  const preparationStatus = useGenerationPreparation(
    id,
    instructions,
    theses.selectedIds,
    JSON.stringify([
      draftQuery.data?.processDocuments,
      draftQuery.data?.attachments,
      draftQuery.data?.updatedAt,
      theses.theses,
    ]),
    stage === "pregen" &&
      hasTeor &&
      !theses.isLoading &&
      !theses.isError &&
      !theses.isRegenerating &&
      !theses.isTogglingId,
  );

  return {
    draft: draftQuery.data,
    regenerating,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    stage,
    theses,
    highlightedDocId,
    focusSource,
    verAuto,
    autoDrawer,
    fecharAuto,
    gerarMinuta,
    instructions,
    preparationStatus,
    setInstructions: setInstructionsEdit,
    generationError: generate.error?.message,
    regenerateWithTheses,
    contentEdited: !!draftQuery.data?.contentEdited,
    isGenerating: generate.isPending,
    hasOrigin,
    hasTeor,
    voltar,
  };
}
