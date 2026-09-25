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
import { useCallback, useEffect, useRef, useState } from "react";

import { detalheNaFila } from "@/features/intimacoes/lib/fila-navigation";
import { htmlToText } from "@/lib/html/html-to-text";
import { useAIExperience } from "@/lib/telemetry/use-ai-experience";

import { decidirAcaoAuto, decidirAcaoRetry } from "../lib/auto-flow";
import {
  clearInstructions,
  peekInstructions,
} from "../lib/instructions-storage";
import { preconditionFromCode } from "../lib/peca-precondition";
import type { SagaState, Thesis } from "../types";
import { useAssessment, useDraft } from "./use-draft";
import { thesesKey, useGenerateDraft, useThesesController } from "./use-theses";
import {
  THESIS_EVIDENCE_INVALID_CODE,
  useThesesStream,
} from "./use-theses-stream";

const THESIS_EVIDENCE_MESSAGE =
  "Uma sugestão citou trecho ausente das fontes consultadas. Os fundamentos anteriores foram preservados; revise os autos e tente novamente.";

/** Estágio do CENTRO da tela — a barra e o rail não mudam entre estágios. */
export type CenterStage = "pregen" | "gerando" | "pronta" | "falha";

/** Deriva o estágio do centro a partir do saga_state + um flag local de
 *  "acabei de clicar Gerar". O flag existe porque, entre o POST /generate e o
 *  saga entrar em CREATED/EXTRACTING no próximo poll, há uma janela em que o
 *  saga ainda é o anterior — sem o flag, o centro piscaria de volta pro CTA. */
function deriveStage(
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
  const [streamInvalid, setStreamInvalid] = useState(false);
  const [streamErrorRecovered, setStreamErrorRecovered] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);
  const noPersisted =
    theses.theses.length === 0 && !theses.isLoading && !theses.isError;
  const streamEnabled =
    hasOrigin && hasTeor && noPersisted && !streamFellBack && !streamInvalid;

  // "Settled" = o stream (ou o fallback síncrono) já CONCLUIU pelo menos uma
  // tentativa real de obter teses — distinto de "ainda vazio porque a 1ª
  // renderização aconteceu antes do SSE conectar" (status inicial "idle").
  // Sem essa distinção, uma lista vazia genuína (sem fundamento algum
  // encontrado) nunca seria diferenciada de "ainda carregando" — travando o
  // loader de auto-partida pra sempre (achado real do root).
  const settledRef = useRef(false);

  const onStreamDone = useCallback(
    (authoritative: Thesis[]) => {
      // A lista autoritativa traz ids reais + state inicial persistido — o
      // controller (useTheses query) passa a servir dela.
      settledRef.current = true;
      qc.setQueryData(thesesKey(id), authoritative);
    },
    [qc, id],
  );

  const onStreamError = useCallback(
    (hadThesis: boolean, _message?: string, code?: string) => {
      if (code === THESIS_EVIDENCE_INVALID_CODE) {
        settledRef.current = true;
        setStreamInvalid(true);
        setAutoFailed(true);
        return;
      }
      // Falha pré-1ª-tese → degrada pro POST síncrono (desliga o stream). Falha
      // mid-stream → mantém os cards; o erro inline vem do state do stream e o
      // usuário reusa o regenerate. Em ambos os casos o stream por si só NÃO
      // "settled" ainda — quem conclui é o POST síncrono (fallback) ou o próprio
      // erro (`theses.isError`, já tratado à parte na decisão de auto-disparo).
      if (!hadThesis) setStreamFellBack(true);
    },
    [],
  );

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
  useEffect(() => {
    if (
      streamFellBack &&
      noPersisted &&
      !theses.isRegenerating &&
      !settledRef.current
    )
      regenerate();
  }, [streamFellBack, noPersisted, theses.isRegenerating, regenerate]);

  // Marca "settled" quando o POST síncrono (fallback OU "Atualizar
  // fundamentos" manual) CONCLUI (pending→não-pending) — sucesso ou erro
  // (erro já é pego por `theses.isError` na decisão; aqui só fecha a janela
  // de "ainda tentando" pro caso de sucesso com lista vazia).
  const wasRegenerating = useRef(theses.isRegenerating);
  useEffect(() => {
    if (wasRegenerating.current && !theses.isRegenerating) {
      settledRef.current = true;
    }
    wasRegenerating.current = theses.isRegenerating;
  }, [theses.isRegenerating]);

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
  // Conferência (assessment) em andamento? Sinal real da fase 2 do loader — o
  // ciclo REST (request+poll+validate) roda antes do generate flipar EXTRACTING.
  const [firedAssessment, setFiredAssessment] = useState(false);
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
    setFiredAssessment(false);
    try {
      await generate.mutateAsync({
        thesisIds,
        instructions: instructions.trim(),
        expectedCurrentVersionId: draftQuery.data?.currentVersionId ?? null,
        revision,
        onAssessmentStarted: () => setFiredAssessment(true),
      });
    } catch (error) {
      setFiredGenerate(false);
      setFiredAssessment(false);
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
    setFiredAssessment(false);
    generate.mutate(
      {
        thesisIds: theses.selectedIds,
        instructions: instructions.trim(),
        expectedCurrentVersionId: draftQuery.data?.currentVersionId ?? null,
        onAssessmentStarted: () => setFiredAssessment(true),
      },
      {
        onError: () => {
          setFiredGenerate(false);
          setFiredAssessment(false);
        },
      },
    );
  };

  const voltar = () =>
    router.push(
      params.get("retorno")
        ? params.get("retorno")!
        : draftQuery.data?.intimation.id
          ? detalheNaFila(draftQuery.data.intimation.id, "/intimacoes")
          : "/intimacoes",
    );

  const hasContent =
    !!draftQuery.data?.contentHtml && draftQuery.data.contentHtml.trim() !== "";
  const assessmentRequired =
    saga === "CREATED" && !hasContent && hasOrigin && hasTeor;
  const assessment = useAssessment(id, assessmentRequired);
  const assessmentFailed =
    assessmentRequired &&
    !assessment.isFetching &&
    (assessment.data?.request?.status === "failed" ||
      assessment.data?.request?.status === "superseded");
  const assessmentReadError = assessmentRequired && assessment.isError;
  const stage = deriveStage(saga, firedGenerate, hasContent);
  // Regeração em curso: a peça já tinha folha e o saga voltou a EXTRACTING/CREATED.
  // O centro fica em "pronta" e a folha streama o novo conteúdo.
  const regenerating =
    stage === "pronta" &&
    (saga === "EXTRACTING" || (saga === "CREATED" && firedGenerate));

  // ── NAVEGAR-PRIMEIRO: auto-partida NA TELA DA PEÇA ─────────────────────────
  // Qualquer rascunho ainda sem conteúdo (stage 'pregen') dispara a partida
  // sozinho, assim que as teses (draft-scoped, via stream) estão prontas: TODAS
  // elas + o prompt opcional (sessionStorage por draftId). O loader de 4 fases
  // aparece desde o início. Falha → autoFailed → estado de erro limpo + "Tentar
  // de novo" (retryAuto). NUNCA gated por `?auto=1` na URL — abolido: qualquer
  // entrada (reabrir peça da lista/processo sem o param, refresh, retorno da
  // fila) precisa do MESMO comportamento, nunca cair no wizard antigo de
  // escolher tese manualmente (ver `lib/auto-flow.ts`).
  //
  // A DECISÃO (o que fazer dado o estado atual) é pura — `decidirAcaoAuto`,
  // testável sem montar o hook/efeitos reais. O efeito abaixo é só um
  // dispatcher fino sobre ela.
  const autoFired = useRef(false);
  const retryInFlight = useRef(false);
  const [retrying, setRetrying] = useState(false);
  // Janela em que o loader deve aparecer antes/durante o disparo automático
  // (evita um flash do pregen enquanto as teses ainda chegam).
  const autoPending =
    ((saga === "CREATED" &&
      !autoFailed &&
      !assessmentFailed &&
      !assessmentReadError &&
      !theses.isError) ||
      retrying) &&
    !hasContent;
  useEffect(() => {
    if (
      autoFired.current ||
      autoFailed ||
      retryInFlight.current ||
      (assessmentRequired &&
        (!assessment.isSuccess || assessment.isFetching || assessmentFailed))
    )
      return;
    const acao = decidirAcaoAuto({
      hasOrigin,
      hasTeor,
      saga,
      hasContent,
      firedGenerate,
      theses,
      settled: settledRef.current,
    });
    if (acao.tipo === "esperar") return;
    if (acao.tipo === "falhar") {
      setAutoFailed(true);
      return;
    }
    autoFired.current = true;
    const instr = peekInstructions(id).trim();
    setFiredGenerate(true);
    setFiredAssessment(false);
    generate.mutate(
      {
        thesisIds: acao.thesisIds,
        instructions: instr,
        expectedCurrentVersionId: draftQuery.data?.currentVersionId ?? null,
        onAssessmentStarted: () => setFiredAssessment(true),
      },
      {
        onError: () => {
          setFiredGenerate(false);
          setFiredAssessment(false);
          setAutoFailed(true);
        },
      },
    );
  }, [
    autoFailed,
    assessmentRequired,
    assessment.isSuccess,
    assessment.isFetching,
    assessmentFailed,
    saga,
    hasContent,
    firedGenerate,
    hasOrigin,
    hasTeor,
    theses,
    generate,
    id,
    draftQuery.data?.currentVersionId,
  ]);

  // O 202 apenas enfileira o worker. Guarde a orientação para um retry após
  // falha assíncrona; só a peça realmente pronta encerra essa tentativa.
  useEffect(() => {
    if ((saga === "DRAFTED" || saga === "REVIEWED") && hasContent)
      clearInstructions(id);
  }, [saga, hasContent, id]);

  // Falha assíncrona detectada por POLLING (não pela mutation desta sessão) —
  // ex.: SSE caiu depois do 202 e o worker marcou saga_state=FAILED no BE, mas
  // esta aba nunca chamou `generate` (ex.: reabriu um rascunho já em FAILED).
  // Sem isto, `autoFailed` (só setado no onError da PRÓPRIA mutation) ficaria
  // `false` e a tela cairia no ramo "sem conteúdo" — hoje "carregando" (nunca
  // mais o wizard), mas um loader sobre um saga que não vai avançar sozinho.
  // Reage ao `saga==='FAILED'` real, não a um evento local.
  const autoFailedReal =
    (autoFailed ||
      saga === "FAILED" ||
      assessmentFailed ||
      assessmentReadError) &&
    !hasContent &&
    !retrying;

  // Retry explícito: teses com erro/vazias são aguardadas antes da mutation de
  // geração. O mesmo draft e a orientação sobrevivem ao 202 e ao refresh.
  const retryAuto = async () => {
    if (
      retryInFlight.current ||
      generate.isPending ||
      hasContent ||
      (assessmentRequired && assessment.isFetching)
    )
      return;
    retryInFlight.current = true;
    setRetrying(true);
    setAutoFailed(false);
    try {
      const acao = decidirAcaoRetry({ theses });
      const thesisIds =
        acao.tipo === "regerar-teses"
          ? (await theses.regenerateAsync()).map((t) => t.id)
          : theses.theses.map((t) => t.id);
      if (thesisIds.length === 0)
        throw new Error("Nenhum fundamento foi encontrado. Tente novamente.");
      // The stream stays terminal, but valid authoritative theses recovered by
      // this explicit action must not mask a later assessment/generation error.
      setStreamErrorRecovered(true);
      // O saga pode continuar FAILED até o POST /generate completar: a sequência
      // do retry é explícita e não depende do efeito reservado ao draft CREATED.
      autoFired.current = true;
      setFiredGenerate(true);
      setFiredAssessment(false);
      await generate.mutateAsync({
        thesisIds,
        instructions: (peekInstructions(id) || instructions).trim(),
        expectedCurrentVersionId: draftQuery.data?.currentVersionId ?? null,
        onAssessmentStarted: () => setFiredAssessment(true),
      });
    } catch {
      setFiredGenerate(false);
      setFiredAssessment(false);
      setAutoFailed(true);
    } finally {
      retryInFlight.current = false;
      setRetrying(false);
    }
  };

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
  const thesisErrorMessage =
    (streamInvalid && !streamErrorRecovered) ||
    theses.errorCode === THESIS_EVIDENCE_INVALID_CODE
      ? THESIS_EVIDENCE_MESSAGE
      : undefined;

  return {
    draft: draftQuery.data,
    regenerating,
    isLoading: draftQuery.isLoading,
    isError: draftQuery.isError,
    stage,
    theses: { ...thesesView, errorMessage: thesisErrorMessage },
    highlightedDocId,
    focusSource,
    verAuto,
    autoDrawer,
    fecharAuto,
    gerarMinuta,
    instructions,
    setInstructions: setInstructionsEdit,
    // Pré-condições conhecidas (tipo do ato / trabalho não confirmado) ganham
    // frase clara e acionável; nunca a mensagem crua do BE nem "Tente novamente".
    generationError: (() => {
      if (thesisErrorMessage) return thesisErrorMessage;
      const e = generate.error as
        { message?: string; code?: string } | undefined;
      if (!e)
        return assessmentReadError
          ? "Não foi possível verificar a conferência das fontes. Tente novamente."
          : undefined;
      const pre = preconditionFromCode(e.code);
      return pre ? `${pre.title} ${pre.description}` : e.message;
    })(),
    regenerateWithTheses,
    contentEdited: !!draftQuery.data?.contentEdited,
    isGenerating: generate.isPending,
    // Conferência (assessment) em curso — sinal real da fase 2 do loader.
    assessmentActive: firedAssessment && saga !== "EXTRACTING",
    // Janela da auto-partida (rascunho fresco, sem conteúdo): mostra o loader
    // direto, antes mesmo do generate disparar (enquanto as teses chegam).
    autoPending,
    // Falha da geração (desta sessão OU detectada por polling) → estado de
    // erro + "Tentar de novo". Nunca gated por parâmetro de URL.
    autoFailed: autoFailedReal,
    retryAuto,
    hasOrigin,
    hasTeor,
    voltar,
  };
}
