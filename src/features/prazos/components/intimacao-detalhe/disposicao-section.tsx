"use client";

// UNIDADE DE TRABALHO da intimação — sem o conceito de "providência". Responde em
// texto "O QUE ACONTECEU" (o ato, ex.: "Sentença") + "TRABALHO NECESSÁRIO" (o que
// precisa ser alcançado). Os DOIS botões primários (Gerar peça · Dar ciência) NÃO
// vivem mais aqui: subiram para o topo do detalhe, ao lado do ⋮ (ver AcoesPrimarias
// em intimacao-detalhe.tsx), sem gate. Aqui fica só o conteúdo + o botão "Analisar
// intimação" (materializa o que aconteceu). O action_item por baixo é só encanamento
// — nunca aparece como "providência".

import { Check, FileText, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";

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
  resolvida = false,
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
  /** Intimação resolvida (deu-se ciência) — a unidade de trabalho é a intimação. */
  resolvida?: boolean;
  /** ai_act — o ato que ocorreu (ex.: "Sentença"). "" antes da análise. */
  ato: string;
  tipoLabel: string;
  assunto: string;
}) {
  const { disposicao } = useDisposicao({ intimationId, providencias, retorno });

  const bloqueado = reviewBlocked || checkingReview;
  const semAnalise = disposicao.vazia && !analyzed;

  // Texto do "trabalho necessário": descreve o que precisa ser alcançado.
  const descricaoTrabalho =
    disposicao.tipo === "trabalho"
      ? disposicao.pecas.map((p) => p.label).join(" · ")
      : "Nenhuma peça a produzir — basta dar ciência para resolver a intimação.";

  return (
    <section
      id="disposicao-intimacao"
      aria-label="Unidade de trabalho"
      className="border-primary/30 relative flex scroll-mt-6 flex-col gap-5 overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{
        backgroundImage:
          "linear-gradient(158deg, color-mix(in oklch, var(--primary) 12%, var(--card)), color-mix(in oklch, var(--primary) 4%, var(--card)) 62%, var(--card))",
        boxShadow:
          "0 18px 48px -16px color-mix(in oklch, var(--primary) 34%, transparent), inset 0 1px 0 0 color-mix(in oklch, white 55%, transparent)",
      }}
    >
      {/* accent premium no topo — assinatura primary→gold; puxa o olho pro herói (o trabalho). */}
      <span
        className="absolute inset-x-0 top-0 h-0.5"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, var(--primary), var(--gold), transparent)",
        }}
        aria-hidden
      />
      <div className="min-w-0">
        <p className="brand-kicker">Unidade de trabalho</p>
        <h2 className="font-display mt-1.5 text-2xl leading-tight font-medium tracking-tight">
          O que fazer com esta intimação
        </h2>
      </div>

      {bloqueado ? (
        <p className="text-muted-foreground text-sm" role="status">
          {checkingReview
            ? "Verificando a revisão do tipo e do prazo…"
            : "Confirme o tipo e o prazo desta intimação antes de dar ciência ou construir a peça."}
        </p>
      ) : resolvida ? (
        <p className="text-primary flex items-center gap-2 text-sm font-medium">
          <Check className="size-4" aria-hidden />
          Ciência registrada — nada mais a fazer nesta intimação.
        </p>
      ) : semAnalise ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground text-sm">
            {analyzing
              ? "Analisando a intimação para descobrir o que aconteceu e o que precisa ser feito…"
              : "Descubra o que aconteceu e o trabalho necessário — ou dê ciência / gere a peça pelos botões no topo."}
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
            <Button variant="outline" onClick={onAnalyze}>
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
          <div className="border-line bg-card flex flex-col gap-1.5 rounded-xl border p-4 shadow-[var(--shadow-surface)]">
            <p className="section-label">Trabalho necessário</p>
            <div className="flex items-start gap-3">
              <span
                className="text-primary-foreground mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg shadow-sm"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary), black 14%))",
                }}
              >
                <FileText className="size-4" aria-hidden />
              </span>
              <p className="text-foreground min-w-0 text-sm leading-relaxed break-words">
                {descricaoTrabalho}
              </p>
            </div>
          </div>

          {analyzed && !bloqueado ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                disabled={analyzing}
                onClick={onAnalyze}
              >
                <Sparkles data-icon="inline-start" />
                {analyzing ? "Atualizando…" : "Analisar de novo"}
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {analysisError ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível analisar a intimação. Tente novamente.
        </p>
      ) : null}
    </section>
  );
}
