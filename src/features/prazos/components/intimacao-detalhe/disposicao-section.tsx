"use client";

import { Check, FileText, LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { IntimacaoProvidencia } from "@/features/intimacoes/types";
import { GerarPecaModal } from "@/features/pecas-v2/components/pregen/gerar-peca-modal";

import { ANALYSIS_PROCESSING_MESSAGE } from "../../../intimacoes/lib/analysis-materialization";
import { useDisposicao } from "../../hooks/use-disposicao";

// Chave sessionStorage usada para transportar `instructions` do modal até o
// ConstructionEntry, evitando colocar 2000 chars na URL/history.
export const INSTRUCTIONS_SESSION_KEY = "peca:instructions:";

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
  // Ainda sem action_items: intimação por analisar (ou análise em curso).
  const semAnalise = disposicao.vazia && !analyzed;

  function handleGenerate(instructions: string) {
    const url = buildGerarUrl(pendingActionItemId);
    if (instructions) {
      // Transporta as instructions via sessionStorage (curta duração — limpo
      // pelo ConstructionEntry após a leitura).
      try {
        sessionStorage.setItem(
          `${INSTRUCTIONS_SESSION_KEY}${pendingActionItemId}`,
          instructions,
        );
      } catch {
        // sessionStorage indisponível (modo privado restrito) — degrada sem instructions.
      }
    }
    router.push(url);
  }

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
                onClick={() => {
                  if (peca.jaIniciada) {
                    // Peça já iniciada: abre direto (reabrir rascunho existente).
                    router.push(buildGerarUrl(peca.actionItemId));
                  } else {
                    openGerarModal(peca.actionItemId);
                  }
                }}
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

      {/* Modal de orientação opcional da geração */}
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
