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

import type { SagaState, Thesis } from "../types";
import { useDraft } from "./use-draft";
import {
  type EditorThesisAction,
  useGenerateDraft,
  useThesesController,
} from "./use-theses";

/** Estágio do CENTRO da tela — a barra e o rail não mudam entre estágios. */
export type CenterStage = "pregen" | "gerando" | "pronta";

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
    if (saga === "FAILED") return "pronta";
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
  const draftQuery = useDraft(id);
  const theses = useThesesController(id);
  const generate = useGenerateDraft(id);

  // Auto (documento dos autos) aberto no drawer: o viewer embute o PDF original
  // (busca os bytes por conta própria via /documentos/:id/raw). Guardamos só a
  // identificação do doc + os rótulos do cabeçalho. null = drawer fechado.
  const [autoDrawer, setAutoDrawer] = useState<{
    id: string;
    titulo: string;
    meta: string;
  } | null>(null);

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

  // Abre o PDF original de um auto num drawer com viewer embutido (fiel ao
  // documento — sem texto reconstruído). O viewer busca os bytes sob demanda.
  const verAuto = (doc: { id: string; name: string; meta: string }) => {
    setAutoDrawer({ id: doc.id, titulo: doc.name, meta: doc.meta });
  };

  const fecharAuto = () => setAutoDrawer(null);

  const gerarMinuta = () => {
    if (generate.isPending) return;
    setFiredGenerate(true);
    generate.mutate(theses.selectedIds, {
      onError: () => setFiredGenerate(false),
    });
  };

  // Ação de tese no editor (aprovar/descartar/manter/remover). Aprovar uma
  // INCLUSÃO ou uma REMOÇÃO muda o conjunto de teses da peça → a peça é REGERADA
  // pelo profile (recortar o trecho na unha quebraria coesão E a estrutura do
  // template). Se a peça foi editada à mão, avisa antes de descartar os ajustes
  // ("avisar e confirmar"). As demais ações (descartar/manter) não mexem no texto.
  const onThesisAction = (thesis: Thesis, action: EditorThesisAction) => {
    const regenerates = action === "approve" || action === "approveRemoval";
    if (
      regenerates &&
      draftQuery.data?.contentEdited &&
      typeof window !== "undefined" &&
      !window.confirm(
        "Esta peça foi editada à mão. Aplicar esta mudança de tese vai refazer a peça inteira pelo modelo e descartar seus ajustes manuais. Deseja continuar?",
      )
    ) {
      return;
    }
    theses.editorAction(thesis, action, {
      onSuccess: () => {
        if (!regenerates || generate.isPending) return;
        // O PATCH já persistiu o novo estado da tese; a geração lê o estado
        // persistido (included ∪ pending_add) e reescreve a peça coesa.
        setFiredGenerate(true);
        generate.mutate(theses.selectedIds, {
          onError: () => setFiredGenerate(false),
        });
      },
    });
  };

  const voltar = () => router.push("/pecas");

  const hasContent =
    !!draftQuery.data?.contentHtml && draftQuery.data.contentHtml.trim() !== "";
  const stage = deriveStage(saga, firedGenerate, hasContent);
  // Regeração em curso: a peça já tinha folha e o saga voltou a EXTRACTING/CREATED.
  // O centro fica em "pronta" e a folha streama o novo conteúdo.
  const regenerating =
    stage === "pronta" &&
    (saga === "EXTRACTING" || (saga === "CREATED" && firedGenerate));

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
    onThesisAction,
    isGenerating: generate.isPending,
    voltar,
  };
}
