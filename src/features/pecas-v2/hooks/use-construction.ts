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

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";
import { htmlToText } from "@/lib/html/html-to-text";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";

import type { SagaState, Thesis } from "../types";
import { useDraft } from "./use-draft";
import { thesesKey, useGenerateDraft, useThesesController } from "./use-theses";
import { useThesesStream } from "./use-theses-stream";

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
  const theses = useThesesController(id);
  const generate = useGenerateDraft(id);
  const qc = useQueryClient();

  // ── Streaming SSE dos fundamentos da CONSTRUÇÃO (aparecem um a um) ──────────
  // Espelha o fluxo da partida (use-partida) mas draft-scoped ("pecas/${id}"):
  // liga no 1º acesso do pregen quando a query GET já resolveu sem tese
  // persistida. Degrada como a partida — falha pré-1ª-tese → cai no POST
  // síncrono (regenerate do controller); falha mid-stream → mantém os cards +
  // "Tentar novamente" (o próprio regenerate). Na `done`, semeia o cache draft-
  // scoped com a lista autoritativa pra o controller assumir os ids reais.
  const [streamFellBack, setStreamFellBack] = useState(false);
  const noPersisted =
    theses.theses.length === 0 && !theses.isLoading && !theses.isError;
  const streamEnabled = hasOrigin && hasTeor && noPersisted && !streamFellBack;

  const onStreamDone = useCallback(
    (authoritative: Thesis[]) => {
      // A lista autoritativa traz ids reais + state inicial persistido — o
      // controller (useTheses query) passa a servir dela.
      qc.setQueryData(thesesKey(id), authoritative);
    },
    [qc, id],
  );

  const onStreamError = useCallback((hadThesis: boolean) => {
    // Falha pré-1ª-tese → degrada pro POST síncrono (desliga o stream). Falha
    // mid-stream → mantém os cards; o erro inline vem do state do stream e o
    // usuário reusa o regenerate.
    if (!hadThesis) setStreamFellBack(true);
  }, []);

  const stream = useThesesStream(`pecas/${id}`, {
    enabled: streamEnabled,
    onDone: onStreamDone,
    onError: onStreamError,
  });

  // Degradação: quando o stream falha pré-1ª-tese, dispara o generate síncrono
  // do controller (ele cuida do cache). O próprio regenerate dedupa (no-op se já
  // estiver gerando), e o gate `noPersisted` deixa de valer assim que a lista
  // chega — então não re-dispara. Espelha o `fellBack && generate.isIdle` da
  // partida sem um setState extra dentro do efeito.
  const regenerate = theses.regenerate;
  const shouldFallback =
    streamFellBack && noPersisted && !theses.isRegenerating;
  useEffect(() => {
    if (shouldFallback) regenerate();
  }, [shouldFallback, regenerate]);

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

  // Fonte das teses a exibir: enquanto o stream está ativo (ou parou no meio com
  // cards já mostrados), usa a lista incremental do stream; senão a lista
  // persistida do controller (pós-`done`, ela vira autoritativa via setQueryData).
  const streamActive = stream.status === "streaming";
  const streamMidError = stream.status === "error" && stream.theses.length > 0;
  // Cinto de segurança: assim que EXISTE tese autoritativa persistida (o controller
  // já tem a lista — via `done` do stream ou regeneração), a view autoritativa
  // vence SEMPRE, mesmo que o `stream.status` tenha ficado preso em "streaming"
  // (ex.: o efeito foi desmontado antes do `done` num teardown do StrictMode). Sem
  // isto, o header "consultando os autos…" ficava pra sempre com a lista já pronta.
  const useStreamTheses =
    (streamActive || streamMidError) && theses.theses.length === 0;

  // thesesView reveste o controller: enquanto streama, mostra os cards do stream
  // + o header/fantasma ao vivo (prop `streaming`) e suprime o skeleton. TODAS as
  // ações (toggle/regenerate/selectedIds) seguem apontando pro controller real — a
  // seleção/geração não muda. Pós-`done` o controller assume (cache semeado), então
  // isto vira um passthrough puro.
  const thesesView = useStreamTheses
    ? {
        ...theses,
        theses: stream.theses,
        // Não pisca o skeleton: o header ao vivo + os cards que chegam já são
        // o feedback (fiel à UI de streaming já construída).
        isLoading: false,
        streaming: streamActive
          ? { active: true, count: stream.count }
          : undefined,
      }
    : { ...theses, streaming: undefined };

  return {
    draft: draftQuery.data,
    regenerating,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    stage,
    theses: thesesView,
    highlightedDocId,
    focusSource,
    verAuto,
    autoDrawer,
    fecharAuto,
    gerarMinuta,
    instructions,
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
