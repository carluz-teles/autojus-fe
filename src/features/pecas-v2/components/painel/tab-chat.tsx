"use client";

// Aba "Chat" do painel lateral. Thread scrollável (bolhas simples) + quick
// actions em chips + input livre. Autoscroll ao final quando chega mensagem.

import { useEffect, useRef } from "react";

import type { ChatMessage, QuickActionKind } from "../../types";
import { Chip } from "./chip";
import { ComposeInput } from "./compose-input";
import { MessageBubble } from "./message-bubble";

const QUICK_ACTIONS: { kind: QuickActionKind; label: string }[] = [
  { kind: "summarize_case", label: "Resumir os autos" },
  { kind: "suggest_theses", label: "Sugerir teses" },
  { kind: "check_deadline", label: "Conferir o prazo" },
  { kind: "find_precedents", label: "Encontrar precedentes" },
];

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onQuickAction: (kind: QuickActionKind) => void;
  /** Enquanto o assistant está respondendo, mostra bolha com dots. */
  assistantThinking?: boolean;
  /** Contador que reseta o input após envio. */
  resetKey?: number;
}

export function TabChat({
  messages,
  onSend,
  onQuickAction,
  assistantThinking = false,
  resetKey = 0,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, assistantThinking]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
            />
          ))}
          {assistantThinking && (
            <MessageBubble
              role="assistant"
              content=""
              createdAt={new Date().toISOString()}
              loading
            />
          )}
        </div>
      </div>

      <div className="border-border border-t px-4 py-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_ACTIONS.map((q) => (
            <Chip
              key={q.kind}
              disabled={assistantThinking}
              onClick={() => onQuickAction(q.kind)}
            >
              {q.label}
            </Chip>
          ))}
        </div>
        <ComposeInput
          placeholder="Pergunte sobre os autos ou a peça…"
          disabled={assistantThinking}
          resetKey={resetKey}
          onSend={onSend}
        />
      </div>
    </div>
  );
}
