"use client";

// Textarea auto-grow + botão circular verde de enviar. Enter envia, Shift+Enter
// quebra linha. Uncontrolled + remount por `resetKey` pra limpar após envio —
// evita cascading renders de state derivado em effect.

import { ArrowUp } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface Props {
  placeholder: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  /** Muda para remontar o textarea (limpa uncontrolled + reseta altura). */
  resetKey?: number;
}

export function ComposeInput({
  placeholder,
  disabled = false,
  onSend,
  resetKey = 0,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [hasContent, setHasContent] = useState(false);

  const canSend = hasContent && !disabled;

  const submit = () => {
    const el = taRef.current;
    if (!el) return;
    const val = el.value.trim();
    if (!val || disabled) return;
    onSend(val);
    el.value = "";
    el.style.height = "";
    setHasContent(false);
  };

  return (
    <div className="border-border bg-background flex items-end gap-2 rounded-lg border px-3 py-2">
      <textarea
        key={resetKey}
        ref={taRef}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "0px";
          el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          setHasContent(el.value.trim().length > 0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="text-foreground placeholder:text-muted-foreground max-h-[120px] flex-1 resize-none bg-transparent text-[13px] leading-[1.5] focus:outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label="Enviar"
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
          canSend
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  );
}
