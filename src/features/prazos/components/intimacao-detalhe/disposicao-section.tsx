"use client";

import { Check, FileText, LoaderCircle, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";

import { ANALYSIS_PROCESSING_MESSAGE } from "../../../intimacoes/lib/analysis-materialization";
import { useDisposicao } from "../../hooks/use-disposicao";

/**
 * DISPOSIÇÃO da intimação — a unidade de trabalho. Substitui o antigo bloco de
 * "Providências": em vez de listar providências, responde "só ciência ou N
 * peças?" e leva direto à ação (dar ciência ou construir a peça).
 */
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
}) {
  const { disposicao, onDarCiencia, dandoCiencia, cienciaErro, gerarPecaHref } =
    useDisposicao({ intimationId, providencias, retorno });

  const bloqueado = reviewBlocked || checkingReview;
  // Ainda sem action_items: intimação por analisar (ou análise em curso).
  const semAnalise = disposicao.vazia && !analyzed;

  return (
    <section
      id="disposicao-intimacao"
      aria-label="Disposição da intimação"
      className="surface-panel flex scroll-mt-6 flex-col gap-5 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="section-label">Unidade de trabalho</p>
          <h2 className="font-display mt-1 text-xl font-medium">
            {semAnalise ? "Disposição" : disposicao.headline}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Esta intimação precisa de trabalho ou só de ciência?
          </p>
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
              ? "Analisando a intimação para descobrir a disposição…"
              : "Esta intimação ainda não foi analisada. Descubra se ela pede trabalho ou apenas ciência."}
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
      ) : disposicao.tipo === "ciencia" ? (
        <div className="flex flex-col items-start gap-3">
          {disposicao.ciencia?.concluida ? (
            <p className="text-primary flex items-center gap-2 text-sm font-medium">
              <Check className="size-4" aria-hidden />
              Ciência registrada — nada mais a fazer nesta intimação.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Nenhuma peça a produzir. Registre a ciência para resolver a
                intimação.
              </p>
              <Button disabled={dandoCiencia} onClick={onDarCiencia}>
                {dandoCiencia ? (
                  <LoaderCircle
                    data-icon="inline-start"
                    className="animate-spin"
                  />
                ) : (
                  <Check data-icon="inline-start" />
                )}
                Dar ciência
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="surface-inset flex flex-col divide-y px-4">
          {disposicao.pecas.map((peca) => (
            <div
              key={peca.actionItemId}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="bg-primary/10 text-primary grid size-9 shrink-0 place-items-center rounded-lg">
                  <FileText className="size-4" aria-hidden />
                </span>
                <p className="font-display min-w-0 text-base leading-snug font-medium break-words">
                  {peca.label}
                </p>
              </div>
              <Button
                variant={peca.jaIniciada ? "outline" : "default"}
                nativeButton={false}
                render={<Link href={gerarPecaHref(peca.actionItemId)} />}
              >
                <Sparkles data-icon="inline-start" />
                {peca.jaIniciada ? "Abrir peça" : "Gerar peça"}
              </Button>
            </div>
          ))}
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
    </section>
  );
}
