"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Segmented } from "@/components/mock-ui/layout";
import { Button } from "@/components/ui/button";
import {
  useChatThread,
  useReview,
  useSendChat,
} from "@/features/pecas/hooks/use-peca";
import type { PecaFinding, PecaReview } from "@/features/pecas/types";
import { cn } from "@/lib/utils";

interface AssistentePanelProps {
  pecaId: string;
  review: PecaReview | null;
}

// ── Cores por categoria ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  CLAREZA: "text-emerald-600",
  FUNDAMENTAÇÃO: "text-amber-600",
  FUNDAMENTACAO: "text-amber-600",
  PEDIDO: "text-sky-600",
  COERENCIA: "text-violet-600",
  COERÊNCIA: "text-violet-600",
  FUNDAMENTOS: "text-amber-600",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat.toUpperCase()] ?? "text-muted-foreground";
}

// ── Sugestões tab ────────────────────────────────────────────────────────────

function SugestoesTab({
  pecaId,
  review,
}: {
  pecaId: string;
  review: PecaReview | null;
}) {
  const reviewMutation = useReview(pecaId);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const findings = review?.findings ?? [];
  const visible = findings.filter((_, i) => !dismissed.has(i));

  const handleDismiss = (n: number) => {
    setDismissed((prev) => new Set(prev).add(n));
  };

  if (!review) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          Ainda não há revisão disponível. Clique em &quot;Revisar com IA&quot;
          para analisar a peça.
        </p>
        <Button
          size="sm"
          disabled={reviewMutation.isPending}
          onClick={() =>
            reviewMutation.mutate(undefined, {
              onError: () => toast.error("Não foi possível gerar a revisão."),
            })
          }
        >
          {reviewMutation.isPending ? "Analisando…" : "Revisar com IA"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Cabeçalho */}
      <div className="px-4 pt-4 pb-3">
        <p className="text-muted-foreground text-[13px]">
          {visible.length === 0
            ? "Nenhuma sugestão pendente."
            : `${visible.length} ${visible.length === 1 ? "sugestão aponta" : "sugestões apontam"} para trechos do editor.`}
        </p>
      </div>

      {/* Lista de findings */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pb-3">
        {visible.map((f) => (
          <FindingCard key={f.n} finding={f} onDismiss={handleDismiss} />
        ))}
      </div>

      {/* Ações */}
      <div className="border-border flex items-center gap-2 border-t px-4 py-3">
        <Button
          size="sm"
          variant="outline"
          disabled={reviewMutation.isPending}
          onClick={() =>
            reviewMutation.mutate(undefined, {
              onError: () => toast.error("Não foi possível gerar a revisão."),
            })
          }
        >
          {reviewMutation.isPending ? "Analisando…" : "Revisar com IA"}
        </Button>
        <Button size="sm" variant="ghost">
          Regenerar minuta
        </Button>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  onDismiss,
}: {
  finding: PecaFinding;
  onDismiss: (n: number) => void;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3.5">
      <div className="mb-2 flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
            "bg-muted text-muted-foreground",
          )}
        >
          {finding.n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[11px] font-semibold tracking-wide uppercase",
                categoryColor(finding.category),
              )}
            >
              {finding.category}
            </span>
            <span className="text-muted-foreground text-[11px]">
              Parágrafo 3
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-[12.5px] leading-relaxed">
            {finding.description}
          </p>
          {finding.problem && (
            <p className="text-muted-foreground mt-1 text-[11.5px] italic">
              Problema: {finding.problem}
            </p>
          )}
          {finding.replacement && (
            <div className="bg-card border-border mt-2 rounded-md border px-2.5 py-1.5 text-[11.5px]">
              <span className="text-muted-foreground">Sugestão: </span>
              {finding.replacement}
            </div>
          )}
        </div>
      </div>
      <div className="ml-8.5 flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 text-[11.5px]">
          Aplicar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-[11.5px]"
          onClick={() => onDismiss(finding.n)}
        >
          Descartar
        </Button>
      </div>
    </div>
  );
}

// ── Chat tab ─────────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  "Resumir os autos",
  "Sugerir teses",
  "Conferir o prazo",
  "Encontrar precedentes",
];

function ChatTab({ pecaId }: { pecaId: string }) {
  const thread = useChatThread(pecaId);
  const sendChat = useSendChat(pecaId);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ao fundo quando chegar mensagem nova.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [thread.data?.messages.length]);

  const handleSend = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setInput("");
    sendChat.mutate(q, {
      onError: () => toast.error("Não foi possível enviar a mensagem."),
    });
  };

  const messages = thread.data?.messages ?? [];
  const grounded = thread.data?.grounded_capable ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Lista de mensagens */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        {messages.length === 0 && !thread.isPending && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-muted-foreground text-[13px]">
              Faça uma pergunta sobre os autos ou a peça.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa}
                  type="button"
                  onClick={() => handleSend(qa)}
                  className="bg-muted/70 hover:bg-muted rounded-full px-3 py-1 text-[11.5px] transition-colors"
                >
                  {qa}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
        </div>

        {thread.isPending && (
          <div className="text-muted-foreground py-2 text-[12px]">
            Carregando conversa…
          </div>
        )}
        {sendChat.isPending && (
          <div className="text-muted-foreground py-2 text-[12px]">
            Pensando…
          </div>
        )}
      </div>

      {/* Quick actions quando não há mensagens */}
      {messages.length === 0 && (
        <div className="border-border flex flex-wrap gap-1.5 border-t px-4 py-2.5">
          {QUICK_ACTIONS.map((qa) => (
            <button
              key={qa}
              type="button"
              onClick={() => handleSend(qa)}
              className="bg-muted/70 hover:bg-muted rounded-full px-3 py-1 text-[11.5px] transition-colors"
            >
              {qa}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-border flex items-center gap-2 border-t px-4 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
          placeholder="Pergunte sobre os autos ou a peça..."
          disabled={sendChat.isPending}
          className="bg-muted/40 placeholder:text-muted-foreground/50 focus:ring-ring flex-1 rounded-lg px-3 py-2 text-[13px] focus:ring-1 focus:outline-none"
        />
        <Button
          size="sm"
          disabled={!input.trim() || sendChat.isPending}
          onClick={() => handleSend(input)}
        >
          Enviar
        </Button>
      </div>

      {/* Grounded indicator */}
      {grounded && (
        <div className="border-border flex items-center gap-1.5 border-t px-4 py-1.5">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground text-[10.5px]">
            Respostas ancoradas nos autos
          </span>
        </div>
      )}
    </div>
  );
}

function ChatBubble({
  message,
}: {
  message: { role: string; content: string; created_at: string };
}) {
  const isUser = message.role === "user";
  const initials = isUser ? "Vo" : "IA";

  return (
    <div
      className={cn("flex items-start gap-2.5", isUser && "flex-row-reverse")}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold",
          isUser
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
        )}
      >
        {initials}
      </span>
      <div
        className={cn(
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          isUser ? "bg-muted" : "bg-muted/50",
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <span className="text-muted-foreground mt-1 block text-[10.5px]">
          {new Date(message.created_at).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}

// ── Painel principal ─────────────────────────────────────────────────────────

export function AssistentePanel({ pecaId, review }: AssistentePanelProps) {
  const [aba, setAba] = useState<"sugestoes" | "chat">("sugestoes");

  const tabCount = review?.findings?.length ?? 0;

  return (
    <aside className="border-border flex min-h-0 flex-col border-l">
      <div className="border-border border-b p-4">
        <Segmented
          className="w-full"
          valor={aba}
          onChange={setAba}
          opcoes={[
            {
              valor: "sugestoes",
              label: "Sugestões",
              contagem: tabCount > 0 ? String(tabCount) : undefined,
            },
            { valor: "chat", label: "Chat" },
          ]}
        />
      </div>

      {aba === "sugestoes" ? (
        <SugestoesTab pecaId={pecaId} review={review} />
      ) : (
        <ChatTab pecaId={pecaId} />
      )}
    </aside>
  );
}
