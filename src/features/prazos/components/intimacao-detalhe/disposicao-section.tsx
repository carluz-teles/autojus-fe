"use client";

// UNIDADE DE TRABALHO da intimação — sem o conceito de "providência". Responde em
// texto "O QUE ACONTECEU" (o ato, ex.: "Sentença") + "TRABALHO NECESSÁRIO" (o que
// precisa ser alcançado) e oferece DOIS botões: Gerar peça e Dar ciência. O
// action_item por baixo é só encanamento (id do "Gerar peça" e o que "Dar ciência"
// conclui) — nunca aparece como "providência". Reusa o fluxo de peça validado
// (useDisposicao + GerarPecaModal).

import { Check, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";
import { GerarPecaModal } from "@/features/pecas-v2/components/pregen/gerar-peca-modal";
import { setInstructions } from "@/features/pecas-v2/lib/instructions-storage";

import { ANALYSIS_PROCESSING_MESSAGE } from "../../../intimacoes/lib/analysis-materialization";
import { useDisposicao } from "../../hooks/use-disposicao";

export function DisposicaoSection({
  intimationId,
  providencias,
  retorno,
  analyzed,
  analyzing,
  analysisError,
  analysisProcessingTimeout = false,
  onAnalyze,
  reviewBlocked = false,
  checkingReview = false,
  ato,
  tipoLabel,
  assunto,
}: {
  intimationId: string;
  providencias: IntimacaoProvidencia[];
  retorno: string;
  analyzed: boolean;
  analyzing: boolean;
  analysisError?: boolean;
  analysisProcessingTimeout?: boolean;
  onAnalyze: () => void;
  reviewBlocked?: boolean;
  checkingReview?: boolean;
  /** ai_act — o ato que ocorreu (ex.: "Sentença"). "" antes da análise. */
  ato: string;
  tipoLabel: string;
  assunto: string;
}) {
  const router = useRouter();
  const {
    disposicao,
    onDarCiencia,
    dandoCiencia,
    cienciaErro,
    modalOpen,
    pendingActionItemId,
    openGerarModal,
    closeGerarModal,
    buildGerarUrl,
    pecaLabel,
  } = useDisposicao({ intimationId, providencias, retorno });

  const bloqueado = reviewBlocked || checkingReview;
  const semAnalise = disposicao.vazia && !analyzed;

  // Peça-alvo do botão "Gerar peça": a 1ª que gera peça; se só houver ciência,
  // usa o próprio item de ciência (o BE deriva o tipo). "" quando nada há.
  const pecaAlvo = disposicao.pecas[0] ?? null;
  const alvoId = pecaAlvo?.actionItemId ?? disposicao.ciencia?.actionItemId ?? "";

  // Texto do "trabalho necessário": descreve o que precisa ser alcançado.
  const descricaoTrabalho =
    disposicao.tipo === "trabalho"
      ? disposicao.pecas.map((p) => p.label).join(" · ")
      : "Nenhuma peça a produzir — basta dar ciência para resolver a intimação.";

  function handleGenerate(instructions: string) {
    const url = buildGerarUrl(pendingActionItemId);
    if (instructions) setInstructions(pendingActionItemId, instructions);
    router.push(url);
  }

  function onGerarPeca() {
    if (!alvoId) return;
    if (pecaAlvo?.jaIniciada) {
      router.push(buildGerarUrl(alvoId));
    } else {
      openGerarModal(alvoId);
    }
  }

  const cienciaConcluida = !!disposicao.ciencia?.concluida;

  return (
    <section
      id="disposicao-intimacao"
      aria-label="Unidade de trabalho"
      className="surface-panel flex scroll-mt-6 flex-col gap-5 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Unidade de trabalho</p>
          <h2 className="font-display mt-1 text-xl font-medium">
            O que fazer com esta intimação
          </h2>
        </div>
        {analyzed && !bloqueado ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={analyzing}
            onClick={onAnalyze}
          >
            <Sparkles data-icon="inline-start" />
            {analyzing ? "Atualizando…" : "Reanalisar"}
          </Button>
        ) : null}
      </div>

      {bloqueado ? (
        <p className="text-muted-foreground text-sm" role="status">
          {checkingReview
            ? "Verificando a revisão do tipo e do prazo…"
            : "Confirme o tipo e o prazo desta intimação antes de dar ciência ou construir a peça."}
        </p>
      ) : semAnalise ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">
            {analyzing
              ? "Analisando a intimação para descobrir o que aconteceu e o que precisa ser feito…"
              : "Esta intimação ainda não foi analisada. Descubra o que aconteceu e o trabalho necessário."}
          </p>
          {analyzing ? (
            <p
              role="status"
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {analysisProcessingTimeout
                ? ANALYSIS_PROCESSING_MESSAGE
                : "Analisando…"}
            </p>
          ) : (
            <Button onClick={onAnalyze}>
              <Sparkles data-icon="inline-start" />
              Analisar intimação
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* O QUE ACONTECEU */}
          <div className="flex flex-col gap-1.5">
            <p className="section-label">O que aconteceu</p>
            <p className="font-display text-lg leading-snug font-medium">
              {ato || tipoLabel}
            </p>
            <p className="text-muted-foreground text-sm">
              {[tipoLabel, assunto].filter(Boolean).join(" · ")}
            </p>
          </div>

          {/* TRABALHO NECESSÁRIO */}
          <div className="surface-inset flex flex-col gap-1.5 p-4">
            <p className="section-label">Trabalho necessário</p>
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg">
                <FileText className="size-4" aria-hidden />
              </span>
              <p className="text-foreground min-w-0 text-sm leading-relaxed break-words">
                {descricaoTrabalho}
              </p>
            </div>
          </div>

          {/* DOIS BOTÕES: Gerar peça · Dar ciência */}
          {cienciaConcluida ? (
            <p className="text-primary flex items-center gap-2 text-sm font-medium">
              <Check className="size-4" aria-hidden />
              Ciência registrada — nada mais a fazer nesta intimação.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button onClick={onGerarPeca} disabled={!alvoId}>
                <Sparkles data-icon="inline-start" />
                {pecaAlvo?.jaIniciada ? "Abrir peça" : "Gerar peça"}
              </Button>
              <Button
                variant="outline"
                disabled={dandoCiencia}
                onClick={onDarCiencia}
              >
                {dandoCiencia ? (
                  <LoaderCircle data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                Dar ciência
              </Button>
            </div>
          )}
        </div>
      )}

      {cienciaErro ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível dar ciência. Tente novamente.
        </p>
      ) : null}
      {analysisError ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível analisar a intimação. Tente novamente.
        </p>
      ) : null}

      <GerarPecaModal
        open={modalOpen}
        onOpenChange={(v) => {
          if (!v) closeGerarModal();
        }}
        onGenerate={handleGenerate}
        pecaLabel={pecaLabel}
      />
    </section>
  );
}
