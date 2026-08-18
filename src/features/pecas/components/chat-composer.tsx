"use client";

import { ArrowUp } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;
const COUNTER_THRESHOLD = Math.floor(MAX_CHARS * 0.8); // 1600

export interface ChatComposerProps {
  onSend: (question: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Quando muda de true→false (isSending), o composer recupera o foco. */
  refocusWhenEnabled?: boolean;
}

/**
 * Composer de chat: textarea auto-resize (1-4 linhas), Enter envia,
 * Shift+Enter nova linha, contador ao passar de 80% de 2000 chars.
 */
export function ChatComposer({
  onSend,
  disabled = false,
  placeholder = "Pergunte sobre os autos…",
  refocusWhenEnabled = false,
}: ChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevDisabledRef = useRef(disabled);

  // Foco de volta ao input quando disabled muda de true→false (resposta chegou).
  useEffect(() => {
    if (refocusWhenEnabled && prevDisabledRef.current && !disabled) {
      textareaRef.current?.focus();
    }
    prevDisabledRef.current = disabled;
  }, [disabled, refocusWhenEnabled]);

  const canSend = !disabled && value.trim().length > 0;
  const charCount = value.length;
  const showCounter = charCount >= COUNTER_THRESHOLD;
  const remaining = MAX_CHARS - charCount;

  // Auto-resize: cresce até 4 linhas (~96px), depois scroll interno.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // max-height equivale a ~4 linhas de texto (1.5rem * 4 + padding)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
    // Reset da altura do textarea após limpeza.
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className={cn(
        "border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex items-end gap-2 rounded-xl border px-3 py-2 shadow-xs transition-colors focus-within:ring-3",
        disabled && "opacity-60",
      )}
    >
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              setValue(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={MAX_CHARS}
          aria-label="Mensagem para o assistente"
          className="text-foreground placeholder:text-muted-foreground/70 block w-full resize-none overflow-hidden bg-transparent py-1 text-sm leading-normal outline-none disabled:cursor-not-allowed"
        />
        {/* Contador de caracteres — aparece ao passar de 80% */}
        {showCounter && (
          <span
            aria-live="polite"
            className={cn(
              "pointer-events-none absolute right-0 bottom-1 text-[0.65rem] tabular-nums",
              remaining <= 0 ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {remaining}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Enviar mensagem"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors",
          canSend
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
    </div>
  );
}
