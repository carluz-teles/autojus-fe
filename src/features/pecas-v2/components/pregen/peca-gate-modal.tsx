"use client";

// PRE-FLIGHT da geração de peça — o gate REAL (a análise é cosmética e nunca bloqueia).
// Dispara ao clicar "Gerar peça". Primeiro confirma o tipo do action item quando
// a sugestão da IA requer revisão; depois seguem os checks existentes:
//   Check 1 — Tipo do ato da intimação: se não confirmado, EXIGE a confirmação inline (reusa o
//     control DefinirTipoAto) antes de seguir. É o que limpa ACT_TYPE_NOT_DEFINED.
//   Check 2 — Autos: consulta autos-status. Sem autos é AVISO de qualidade (não
//     bloqueia). Oferece o caminho certo conforme o estado do tribunal/busca, e
//     SEMPRE permite "Gerar mesmo assim".
// Ao passar os dois checks (ou o usuário optar por seguir), chama onProceed — a
// geração de peça existente assume dali.
//
// A11y: base-ui Dialog (foco-trap, Esc/backdrop cancelam), role=dialog + labelledby.
// Só JSX + binding; a lógica vive em usePecaGate.

import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowRight,
  FileText,
  Landmark,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { usePecaGate } from "@/features/pecas-v2/hooks/use-peca-gate";
import { DefinirTipoAto } from "@/features/prazos/components/intimacao-detalhe/definir-tipo-ato";
import type { PrazoDetalheView } from "@/features/prazos/types";
import { cn } from "@/lib/utils";

import { ActionItemReview } from "./action-item-review";

export interface PecaGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intimacaoId: string;
  processoId: string;
  actionItemId?: string;
  degree?: string;
  /** Prazo atual — semeia o control de tipo (Check 1). */
  prazo: PrazoDetalheView | null;
  /** true quando o tipo do ato já está confirmado (Check 1 satisfeito). */
  tipoConfirmado: boolean;
  /** Rótulo da peça-alvo (ex.: "Contestação") — subtítulo. */
  pecaLabel?: string;
  /** Passou nos checks (ou o usuário optou por seguir) → segue para a geração. */
  onProceed: () => void;
  /** Rota para configurar o tribunal (deep-link). */
  onConfigurarTribunal: () => void;
  onRevisarIntimacao: () => void;
}

export function PecaGateModal({
  open,
  onOpenChange,
  intimacaoId,
  processoId,
  actionItemId,
  degree,
  prazo,
  tipoConfirmado,
  pecaLabel,
  onProceed,
  onConfigurarTribunal,
  onRevisarIntimacao,
}: PecaGateModalProps) {
  const titleId = useId();
  const g = usePecaGate({
    open,
    intimacaoId,
    processoId,
    actionItemId,
    degree,
    tipoConfirmado,
  });

  function proceed() {
    onProceed();
    onOpenChange(false);
  }

  function changeOpen(next: boolean) {
    if (!g.confirmPending) onOpenChange(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 backdrop-blur-[2px]",
            "bg-[color-mix(in_oklch,var(--foreground)_34%,transparent)]",
            "transition-opacity duration-200",
            "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          role="dialog"
          aria-labelledby={titleId}
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-6",
            "data-[starting-style]:[transform:translateY(8px)_scale(0.98)] data-[starting-style]:opacity-0",
            "data-[ending-style]:[transform:translateY(8px)_scale(0.98)] data-[ending-style]:opacity-0",
            "transition-all duration-[280ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          )}
        >
          <div className="bg-card border-line shadow-pop max-h-[calc(100vh-3rem)] w-full max-w-[560px] overflow-y-auto rounded-2xl border p-6">
            {/* fio de luz no topo — assinatura primary→gold */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent, var(--primary), var(--gold), transparent)",
              }}
            />
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-primary flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] uppercase">
                <Sparkles aria-hidden className="size-3.5 shrink-0" />
                Antes de gerar a peça
              </div>
              <Dialog.Close
                aria-label="Fechar"
                disabled={g.confirmPending}
                render={<Button variant="ghost" size="icon-sm" />}
              >
                <X aria-hidden />
              </Dialog.Close>
            </div>

            {g.reviewPending ? (
              <>
                <Dialog.Title id={titleId}>
                  Verificando a providência
                </Dialog.Title>
                <p role="status">Consultando o tipo de trabalho…</p>
              </>
            ) : g.reviewError ? (
              <>
                <Dialog.Title id={titleId}>
                  Não foi possível verificar a providência
                </Dialog.Title>
                <Button onClick={g.retryReview}>Tentar novamente</Button>
              </>
            ) : g.reviewBlock ? (
              <>
                <Dialog.Title id={titleId}>Revise a providência</Dialog.Title>
                <p role="alert">{g.reviewBlock}</p>
                <Button onClick={onRevisarIntimacao}>Voltar à intimação</Button>
              </>
            ) : g.reviewItem ? (
              <ActionItemReview
                item={g.reviewItem}
                pending={g.confirmPending}
                error={g.confirmError}
                onConfirm={g.confirmReview}
                onCancel={() => onOpenChange(false)}
                titleId={titleId}
              />
            ) : g.precisaTipo ? (
              <TipoStep
                titleId={titleId}
                pecaLabel={pecaLabel}
                intimacaoId={intimacaoId}
                prazo={prazo}
              />
            ) : (
              <AutosStep
                titleId={titleId}
                g={g}
                onProceed={proceed}
                onConfigurarTribunal={onConfigurarTribunal}
              />
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Check 1 — Tipo do ato (bloqueante: exige confirmação inline) ────────────────
function TipoStep({
  titleId,
  pecaLabel,
  intimacaoId,
  prazo,
}: {
  titleId: string;
  pecaLabel?: string;
  intimacaoId: string;
  prazo: PrazoDetalheView | null;
}) {
  return (
    <>
      <Dialog.Title
        id={titleId}
        className="font-display mb-1 text-[22px] font-medium"
      >
        Confirme o tipo do ato
      </Dialog.Title>
      <Dialog.Description className="text-muted-foreground mb-4 text-[13px] leading-relaxed">
        Para gerar a peça{pecaLabel ? ` (${pecaLabel})` : ""} com precisão,
        confirme o tipo do ato e o prazo desta intimação. Assim que confirmar, o
        próximo passo aparece aqui.
      </Dialog.Description>
      <div className="surface-inset p-4">
        <DefinirTipoAto
          intimacaoId={intimacaoId}
          prazo={prazo}
          ctaLabel="Confirmar e continuar"
          compact
        />
      </div>
    </>
  );
}

// ── Check 2 — Autos (aviso de qualidade, nunca bloqueia) ────────────────────────
function AutosStep({
  titleId,
  g,
  onProceed,
  onConfigurarTribunal,
}: {
  titleId: string;
  g: ReturnType<typeof usePecaGate>;
  onProceed: () => void;
  onConfigurarTribunal: () => void;
}) {
  // Autos presentes (ou status ainda carregando) → nada a avisar; segue direto.
  if (g.statusPendente) {
    return (
      <>
        <Dialog.Title
          id={titleId}
          className="font-display mb-1 text-[22px] font-medium"
        >
          Preparando a peça
        </Dialog.Title>
        <p
          role="status"
          className="text-muted-foreground flex items-center gap-2 py-4 text-sm"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
          Verificando os autos do processo…
        </p>
      </>
    );
  }

  if (g.hasAutos && !g.statusErro) {
    return (
      <>
        <Dialog.Title
          id={titleId}
          className="font-display mb-1 text-[22px] font-medium"
        >
          Tudo pronto para a peça
        </Dialog.Title>
        <Dialog.Description className="text-muted-foreground mb-5 text-[13px] leading-relaxed">
          Os autos deste processo já estão carregados — a peça é construída com
          o processo inteiro.
        </Dialog.Description>
        <div className="flex items-center justify-end gap-2">
          <Button onClick={onProceed}>
            <Sparkles data-icon="inline-start" />
            Gerar peça
          </Button>
        </div>
      </>
    );
  }

  // Sem autos (ou status indisponível) → AVISO de qualidade + caminho acionável.
  return (
    <>
      <Dialog.Title
        id={titleId}
        className="font-display mb-1 text-[22px] font-medium"
      >
        Processo sem autos carregados
      </Dialog.Title>
      <Dialog.Description className="text-muted-foreground mb-4 text-[13px] leading-relaxed">
        Sem os autos, a peça é construída só com a intimação — o resultado fica
        mais superficial. Com os autos, a peça trabalha com o processo inteiro.
      </Dialog.Description>

      <div className="surface-inset mb-4 flex items-start gap-3 p-4">
        <span
          className="text-gold-foreground bg-gold/15 mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg"
          aria-hidden
        >
          <TriangleAlert className="size-4" />
        </span>
        <div className="min-w-0 text-[12.5px] leading-relaxed">
          {g.statusErro ? (
            <p className="text-muted-foreground">
              Não foi possível verificar os autos agora.{" "}
              <button
                type="button"
                onClick={g.recarregarStatus}
                className="text-primary underline underline-offset-4"
              >
                Tentar de novo
              </button>
            </p>
          ) : (
            <AutosPathHint g={g} onConfigurarTribunal={onConfigurarTribunal} />
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={onProceed}>
          Gerar mesmo assim
          <ArrowRight data-icon="inline-end" />
        </Button>
        <AutosPathAction g={g} onConfigurarTribunal={onConfigurarTribunal} />
      </div>
    </>
  );
}

function AutosPathHint({
  g,
  onConfigurarTribunal: _onConfigurarTribunal,
}: {
  g: ReturnType<typeof usePecaGate>;
  onConfigurarTribunal: () => void;
}) {
  if (g.autosPath === "configure")
    return (
      <p className="text-muted-foreground">
        O tribunal {g.court ? `(${g.court}) ` : ""}ainda não está configurado.
        Conecte-o uma vez (certificado + 2FA) e os autos passam a chegar
        sozinhos.
      </p>
    );
  if (g.autosPath === "prioritize")
    return (
      <p className="text-muted-foreground">
        A busca de autos já está em andamento. Priorize esta intimação para que
        os autos deste processo venham primeiro.
      </p>
    );
  if (g.autosPath === "fetch")
    return (
      <p className="text-muted-foreground">
        O tribunal está configurado. Busque os autos deste processo agora — leva
        alguns instantes.
      </p>
    );
  return (
    <p className="text-muted-foreground">
      A importação automática de autos ainda não está disponível para este
      tribunal.
    </p>
  );
}

function AutosPathAction({
  g,
  onConfigurarTribunal,
}: {
  g: ReturnType<typeof usePecaGate>;
  onConfigurarTribunal: () => void;
}) {
  if (g.autosPath === "configure")
    return (
      <Button variant="outline" onClick={onConfigurarTribunal}>
        <Landmark data-icon="inline-start" />
        Configurar tribunal
      </Button>
    );
  if (g.autosPath === "prioritize")
    return (
      <Button
        variant="outline"
        disabled={g.priorizando || g.priorizado}
        onClick={g.onPriorizar}
      >
        {g.priorizando ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : null}
        {g.priorizado ? "Priorizada" : "Priorizar intimação"}
      </Button>
    );
  if (g.autosPath === "fetch")
    return (
      <Button
        variant="outline"
        disabled={g.buscandoAutos || g.buscaPendente || !!g.buscaMotivo}
        onClick={g.onBuscarAutos}
        title={g.buscaMotivo}
      >
        {g.buscandoAutos ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <FileText data-icon="inline-start" />
        )}
        {g.buscaPendente
          ? "Busca em andamento"
          : g.buscandoAutos
            ? "Solicitando…"
            : "Buscar autos"}
      </Button>
    );
  return null;
}
