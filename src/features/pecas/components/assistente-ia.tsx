"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Check, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useChatThread, useSendChat } from "../hooks/use-chat-peca";
import { useGeneratePeca } from "../hooks/use-generate-peca";
import type {
  PecaDetalheView,
  PecaReview,
  PecaSuggestion,
  SuggestionCategory,
} from "../types";
import { ChatComposer } from "./chat-composer";
import { ChatMessage } from "./chat-message";
import { CitationLink } from "./citation-link";

// ── Mapa de cores das categorias ──────────────────────────────────────────────

type CorKey = "sky" | "amber" | "rose" | "violet";

const CATEGORY_COLOR: Record<SuggestionCategory, CorKey> = {
  Clareza: "sky",
  Argumento: "amber",
  Coerência: "rose",
  Estilo: "violet",
};

const COR: Record<
  CorKey,
  {
    num: string;
    mark: string;
    markActive: string;
    ring: string;
    box: string;
    text: string;
  }
> = {
  sky: {
    num: "bg-sky-500 text-white",
    mark: "bg-sky-400/[0.08]",
    markActive: "bg-sky-400/[0.16] ring-1 ring-sky-500/25",
    ring: "ring-1 ring-sky-500/30",
    box: "border-sky-500/20 bg-sky-500/[0.04]",
    text: "text-sky-600 dark:text-sky-400",
  },
  amber: {
    num: "bg-amber-500 text-white",
    mark: "bg-amber-400/[0.10]",
    markActive: "bg-amber-400/[0.18] ring-1 ring-amber-500/25",
    ring: "ring-1 ring-amber-500/30",
    box: "border-amber-500/20 bg-amber-500/[0.05]",
    text: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    num: "bg-rose-500 text-white",
    mark: "bg-rose-400/[0.08]",
    markActive: "bg-rose-400/[0.16] ring-1 ring-rose-500/25",
    ring: "ring-1 ring-rose-500/30",
    box: "border-rose-500/20 bg-rose-500/[0.04]",
    text: "text-rose-600 dark:text-rose-400",
  },
  violet: {
    num: "bg-violet-500 text-white",
    mark: "bg-violet-400/[0.08]",
    markActive: "bg-violet-400/[0.16] ring-1 ring-violet-500/25",
    ring: "ring-1 ring-violet-500/30",
    box: "border-violet-500/20 bg-violet-500/[0.04]",
    text: "text-violet-600 dark:text-violet-400",
  },
};

/** Classes de cor da categoria — reusado pela barra de sugestões do editor. */
export function suggestionColor(category: SuggestionCategory) {
  return COR[CATEGORY_COLOR[category]];
}

// ── SugBlock: destaque no editor ──────────────────────────────────────────────
// Exportado para uso em EditorPecaView.

export interface SugBlockProps {
  suggestion: PecaSuggestion;
  /** Trecho foi editado: original não casa mais no content. */
  stale: boolean;
  active: boolean;
  ignored: boolean;
  applied: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}

export function SugBlock({
  suggestion,
  stale,
  active,
  ignored,
  applied,
  onActivate,
  onDeactivate,
  children,
}: SugBlockProps & { children: React.ReactNode }) {
  const cor = CATEGORY_COLOR[suggestion.category];
  const c = COR[cor];

  return (
    <div className="flex items-start gap-3">
      {/* Número na margem */}
      <span className="flex w-5 shrink-0 justify-center pt-1" aria-hidden>
        {!ignored && !applied && (
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold shadow-sm transition-transform",
              c.num,
              active && "scale-110",
            )}
          >
            {suggestion.n}
          </span>
        )}
        {applied && (
          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="size-3" />
          </span>
        )}
        {ignored && !applied && <span className="w-5" />}
      </span>

      {/* Trecho do texto */}
      <div className="min-w-0 flex-1">
        {ignored ? (
          <div>{children}</div>
        ) : (
          <div
            onMouseEnter={onActivate}
            onMouseLeave={onDeactivate}
            className={cn(
              "-mx-1.5 rounded-md px-1.5 py-0.5 transition-colors",
              applied
                ? "bg-emerald-500/[0.06]"
                : cn(c.mark, active && c.markActive),
              stale && "cursor-not-allowed opacity-60",
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Painel Assistente IA ──────────────────────────────────────────────────────

export interface AssistenteIAProps {
  pecaId: string;
  peca: PecaDetalheView;
  /** Content atual do editor (controlado pelo pai). */
  content: string;
  /** Chamado ao aplicar sugestão com o novo content já substituído. */
  onApplySuggestion: (newContent: string) => void;
  /** Sugestão ativa (hover sync editor↔painel). */
  activeSuggestionN: number | null;
  onActivateSuggestion: (n: number | null) => void;
}

export function AssistenteIA({
  pecaId,
  peca,
  content,
  onApplySuggestion,
  activeSuggestionN,
  onActivateSuggestion,
}: AssistenteIAProps) {
  const { generate, isPending: isGenerating } = useGeneratePeca(pecaId);
  const [ignoredNs, setIgnoredNs] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sagaState = peca.saga_state;
  const review: PecaReview | null = peca.review ?? null;

  // Botão "Gerar com IA" deve aparecer em CREATED / REVIEWED / FAILED / SIGNED /
  // FILED / LABELED — qualquer estado terminal onde não está gerando.
  const canGenerate = sagaState !== "EXTRACTING" && !isGenerating;
  const isExtracting = sagaState === "EXTRACTING" || isGenerating;
  const hasContent = content.trim().length > 0;

  function handleGenerateClick() {
    if (hasContent && review === null) {
      // Content existe mas sem review anterior → só confirma se houver content
      // e ainda não houve geração (pra não perder rascunho manual).
      setConfirmOpen(true);
    } else if (hasContent && review !== null) {
      // Já teve geração → regenerar também exige confirmação.
      setConfirmOpen(true);
    } else {
      // Editor vazio → dispara direto.
      generate();
    }
  }

  function handleConfirmGenerate() {
    setConfirmOpen(false);
    generate();
  }

  function handleIgnore(n: number) {
    setIgnoredNs((prev) => new Set(prev).add(n));
  }

  function handleApply(sug: PecaSuggestion) {
    // Substitui o original pelo replacement no content atual.
    const newContent = content.replace(sug.original, sug.replacement);
    onApplySuggestion(newContent);
    // A sugestão some naturalmente pois original não casa mais no novo content.
  }

  return (
    <>
      {/* Dialog de confirmação (base-ui Dialog — mesma lib do Sheet) */}
      <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="bg-foreground/25 fixed inset-0 z-40 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup className="bg-card text-card-foreground fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-2xl transition-all duration-200 outline-none data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Dialog.Title className="font-display text-lg leading-tight">
              Gerar com IA?
            </Dialog.Title>
            <Dialog.Description className="text-muted-foreground mt-2 text-sm leading-relaxed">
              A IA vai ler os autos e {review ? "regenerar" : "gerar"} a minuta,
              substituindo o conteúdo atual do editor. Esta ação não pode ser
              desfeita.
            </Dialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close render={<Button variant="outline" size="sm" />}>
                Cancelar
              </Dialog.Close>
              <Button size="sm" onClick={handleConfirmGenerate}>
                <Sparkles data-icon="inline-start" />
                {review ? "Regenerar" : "Gerar"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Painel IA */}
      <section
        aria-label="Assistente IA"
        className="bg-card ring-foreground/10 flex w-80 shrink-0 flex-col rounded-xl shadow-sm ring-1"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="bg-gold/15 text-gold flex size-6 items-center justify-center rounded-md"
              aria-hidden
            >
              <Sparkles className="size-3.5" />
            </span>
            <h2 className="font-display text-sm leading-none">Assistente IA</h2>
          </div>
          {isExtracting && (
            <span
              aria-live="polite"
              className="text-muted-foreground animate-pulse text-xs"
            >
              Gerando…
            </span>
          )}
        </div>

        {/* Corpo */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Estado EXTRACTING */}
          {isExtracting ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 p-6"
              aria-live="polite"
              aria-busy="true"
            >
              <span
                className="bg-gold/10 text-gold flex size-12 items-center justify-center rounded-full"
                aria-hidden
              >
                <Sparkles className="size-5 animate-pulse" />
              </span>
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                A IA está lendo os autos e gerando a minuta…
              </p>
            </div>
          ) : sagaState === "FAILED" && review === null ? (
            /* Estado FAILED sem review anterior */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <span
                className="bg-destructive/10 text-destructive flex size-12 items-center justify-center rounded-full"
                aria-hidden
              >
                <TriangleAlert className="size-5" />
              </span>
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                Falha na geração. Verifique se os anexos estão processados e
                tente novamente.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generate()}
                disabled={isGenerating}
              >
                <RotateCcw data-icon="inline-start" />
                Tentar de novo
              </Button>
            </div>
          ) : review !== null ? (
            /* Estado REVIEWED (ou FAILED com review prévia — mostra última revisão) */
            <ReviewPanel
              review={review}
              content={content}
              ignoredNs={ignoredNs}
              activeSuggestionN={activeSuggestionN}
              onActivate={onActivateSuggestion}
              onApply={handleApply}
              onIgnore={handleIgnore}
              onRegenerate={() => setConfirmOpen(true)}
              canRegenerate={canGenerate}
            />
          ) : (
            /* Estado inicial — CREATED / REVIEWED com editor vazio */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
              <span
                className="bg-gold/10 text-gold flex size-12 items-center justify-center rounded-full"
                aria-hidden
              >
                <Sparkles className="size-5" />
              </span>
              <p className="text-muted-foreground text-center text-sm leading-relaxed">
                Clique em &ldquo;Gerar com IA&rdquo; para que o assistente leia
                os autos e redija a minuta automaticamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer: botão Gerar */}
        <div className="border-t p-3">
          <Button
            className="w-full"
            size="sm"
            onClick={handleGenerateClick}
            disabled={!canGenerate}
            aria-busy={isExtracting}
          >
            <Sparkles data-icon="inline-start" />
            {isExtracting
              ? "Gerando…"
              : review
                ? "Regenerar com IA"
                : "Gerar com IA"}
          </Button>
        </div>

        {/* Chat (F3b) */}
        <ChatPanel pecaId={pecaId} pecaHasProcess={!!peca.process} />
      </section>
    </>
  );
}

// ── Painel de sugestões (estado REVIEWED) ────────────────────────────────────

function ReviewPanel({
  review,
  content,
  ignoredNs,
  activeSuggestionN,
  onActivate,
  onApply,
  onIgnore,
  onRegenerate,
  canRegenerate,
}: {
  review: PecaReview;
  content: string;
  ignoredNs: Set<number>;
  activeSuggestionN: number | null;
  onActivate: (n: number | null) => void;
  onApply: (sug: PecaSuggestion) => void;
  onIgnore: (n: number) => void;
  onRegenerate: () => void;
  canRegenerate: boolean;
}) {
  const pending = review.suggestions.filter((s) => !ignoredNs.has(s.n));
  const pendingCount = pending.filter((s) =>
    content.includes(s.original),
  ).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Aviso grounded=false */}
      {!review.grounded && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs"
        >
          <TriangleAlert
            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span className="text-amber-700 dark:text-amber-300">
            Geração sem citação dos autos — anexos podem não estar processados.
          </span>
        </div>
      )}

      {/* Resumo */}
      <p className="text-muted-foreground text-sm leading-relaxed">
        Encontrei{" "}
        <span className="text-foreground font-medium">
          {pendingCount} sugestão{pendingCount !== 1 ? "ões" : ""}
        </span>{" "}
        para fortalecer a peça. Cada uma aponta para o trecho no editor:
      </p>

      {/* Cards das sugestões */}
      <div className="flex flex-col gap-2.5">
        {review.suggestions.map((sug) => {
          const ignored = ignoredNs.has(sug.n);
          const stale = !content.includes(sug.original);
          const applied = !ignored && stale;
          return (
            <SugCard
              key={sug.n}
              suggestion={sug}
              ignored={ignored}
              stale={stale && !ignored}
              applied={applied}
              active={activeSuggestionN === sug.n}
              onEnter={() => onActivate(sug.n)}
              onLeave={() => onActivate(null)}
              onApply={() => onApply(sug)}
              onIgnore={() => onIgnore(sug.n)}
            />
          );
        })}
      </div>

      {/* Link regenerar */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onRegenerate}
          disabled={!canRegenerate}
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Regenerar minuta com IA
        </button>
      </div>
    </div>
  );
}

// ── Card de sugestão individual ───────────────────────────────────────────────

function SugCard({
  suggestion,
  ignored,
  stale,
  applied,
  active,
  onEnter,
  onLeave,
  onApply,
  onIgnore,
}: {
  suggestion: PecaSuggestion;
  ignored: boolean;
  stale: boolean;
  applied: boolean;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onApply: () => void;
  onIgnore: () => void;
}) {
  const cor = CATEGORY_COLOR[suggestion.category];
  const c = COR[cor];

  return (
    <article
      aria-label={`Sugestão ${suggestion.n}: ${suggestion.category}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={cn(
        "rounded-xl border p-3 transition-shadow",
        active && !applied && !ignored && c.ring,
        ignored && "opacity-50",
      )}
    >
      {/* Header do card: número + categoria */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[0.65rem] font-semibold",
              applied ? "bg-emerald-500 text-white" : c.num,
            )}
            aria-hidden
          >
            {applied ? <Check className="size-3" /> : suggestion.n}
          </span>
          <span className="text-sm font-medium">{suggestion.category}</span>
        </div>
      </div>

      {/* Problema */}
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        {suggestion.problem}
      </p>

      {/* Caixa da sugestão */}
      {!ignored && (
        <div
          className={cn(
            "mt-2.5 rounded-lg border px-3 py-2 text-sm leading-relaxed",
            c.box,
          )}
        >
          {suggestion.description}
        </div>
      )}

      {/* Citação documental */}
      {!ignored && suggestion.citation && (
        <CitationLink
          citation={suggestion.citation}
          className={cn("mt-2", c.text)}
        />
      )}

      {/* Ações */}
      <div className="mt-3 flex items-center gap-3">
        {applied ? (
          <span
            className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            role="status"
          >
            <Check className="size-3.5" aria-hidden />
            Aplicada ao texto
          </span>
        ) : ignored ? (
          <span className="text-muted-foreground text-xs" role="status">
            Ignorada
          </span>
        ) : stale ? (
          <span
            className="text-muted-foreground text-xs"
            title="O trecho foi editado manualmente — regenere a minuta para novas sugestões."
          >
            Texto editado — regenere
          </span>
        ) : (
          <>
            <Button
              size="xs"
              onClick={onApply}
              aria-label={`Aplicar sugestão ${suggestion.n}: ${suggestion.category}`}
            >
              Aplicar
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={onIgnore}
              aria-label={`Ignorar sugestão ${suggestion.n}`}
            >
              Ignorar
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

// ── ChatPanel (Fatia 3b) ──────────────────────────────────────────────────────

function ChatPanel({
  pecaId,
  pecaHasProcess,
}: {
  pecaId: string;
  /** Fallback enquanto o thread ainda não carregou (thread === null). */
  pecaHasProcess: boolean;
}) {
  const { thread, isPending: isLoadingThread } = useChatThread(pecaId);

  // thread?.grounded_capable é a fonte autoritativa (GET /chat).
  // pecaHasProcess é usado apenas enquanto o thread ainda não chegou,
  // evitando que o banner apareça/desapareça erroneamente por race condition.
  const grounded_capable =
    thread !== null ? thread.grounded_capable : pecaHasProcess;
  const {
    sendMessage,
    isPending: isSending,
    isError: hasSendError,
    reset: resetSend,
    lastQuestion,
  } = useSendChat(pecaId);

  // Scroll automático para a última mensagem ao atualizar o thread.
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = thread?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function handleSend(question: string) {
    resetSend();
    sendMessage(question);
  }

  function handleRetry() {
    if (lastQuestion) {
      resetSend();
      sendMessage(lastQuestion);
    }
  }

  return (
    <div
      role="region"
      aria-label="Chat com Assistente IA"
      className="flex flex-col border-t"
    >
      {/* Banner: peça sem processo → grounding indisponível */}
      {!grounded_capable && (
        <div
          role="note"
          className="flex items-start gap-2 border-b bg-amber-500/[0.04] px-3 py-2 text-xs"
        >
          <TriangleAlert
            className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <span className="text-amber-700 dark:text-amber-300">
            Sem processo vinculado — respostas sem citação dos autos.
          </span>
        </div>
      )}

      {/* Área de mensagens com scroll interno */}
      <div
        role="list"
        className="flex max-h-72 min-h-0 flex-col gap-3 overflow-y-auto p-3"
        aria-live="polite"
        aria-label="Histórico do chat"
      >
        {/* Estado de carregamento do thread */}
        {isLoadingThread && (
          <p className="text-muted-foreground text-center text-xs">
            Carregando histórico…
          </p>
        )}

        {/* Estado vazio */}
        {!isLoadingThread && messages.length === 0 && (
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            Faça uma pergunta sobre os autos ou a peça.
          </p>
        )}

        {/* Mensagens */}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Indicador de envio (spinner visual) */}
        {isSending && (
          <div className="flex items-start gap-2.5">
            <span
              className="bg-gold/15 text-gold mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md"
              aria-hidden
            >
              <Sparkles className="size-3.5 animate-pulse" />
            </span>
            <span className="text-muted-foreground bg-muted/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm">
              Analisando…
            </span>
          </div>
        )}

        {/* Banner de erro */}
        {hasSendError && !isSending && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/[0.06] flex flex-col gap-2 rounded-lg border px-3 py-2 text-xs"
          >
            <span className="text-destructive">
              Não foi possível obter uma resposta. Verifique a conexão.
            </span>
            {lastQuestion && (
              <button
                type="button"
                onClick={handleRetry}
                className="text-destructive w-fit font-medium underline underline-offset-2"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}

        {/* Âncora de scroll */}
        <div ref={bottomRef} />
      </div>

      {/* Composer fixo no rodapé */}
      <div className="border-t p-3">
        <ChatComposer
          onSend={handleSend}
          disabled={isSending}
          refocusWhenEnabled
        />
      </div>
    </div>
  );
}
