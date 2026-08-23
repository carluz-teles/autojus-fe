"use client";

// Card de uma seção da peça: borda leve, título display serif, parágrafos
// editáveis e o link "↺ Refazer seção" no topo direito. Quando `disabled` é
// true, contentEditable é desligado e o botão fica bloqueado — usado enquanto
// um ajuste está sendo revisado no painel lateral.

import { RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface Props {
  roman: string;
  title: string;
  paragraphs: string[];
  onRefazer: () => void;
  onChangeParagraphs: (paragraphs: string[]) => void;
  /** Desabilita a edição do card e o botão "Refazer seção". */
  disabled?: boolean;
  /** Oculta completamente o botão "Refazer seção" (usado quando autoria=humano
   *  — a ação não faz sentido porque a aba Iterar não existe nesse modo). */
  hideRefazer?: boolean;
}

export function SectionCard({
  roman,
  title,
  paragraphs,
  onRefazer,
  onChangeParagraphs,
  disabled = false,
  hideRefazer = false,
}: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Só reseta o DOM quando os parágrafos mudam externamente (aplicar iteração,
  // ou primeira renderização). Ficar setando innerHTML a cada input causaria
  // pulos de cursor.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const html = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [paragraphs]);

  return (
    <section
      className={cn(
        "border-border rounded-lg border p-6 transition-colors",
        disabled && "opacity-60",
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-4">
        <h3 className="font-display text-lg">
          {roman} — {title}
        </h3>
        {!hideRefazer && (
          <button
            type="button"
            onClick={onRefazer}
            disabled={disabled}
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="size-3" />
            Refazer seção
          </button>
        )}
      </header>
      <div
        ref={bodyRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={(e) => {
          const el = e.currentTarget;
          const next = extractParagraphs(el);
          onChangeParagraphs(next);
        }}
        className="prose-editor focus:outline-none"
      />
    </section>
  );
}

// Renderiza o preâmbulo (sem card, sem "Refazer seção", sem título).
export function PreambleBlock({
  paragraphs,
  onChangeParagraphs,
  disabled = false,
}: {
  paragraphs: string[];
  onChangeParagraphs: (paragraphs: string[]) => void;
  disabled?: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const html = paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("");
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [paragraphs]);

  return (
    <div
      ref={bodyRef}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={(e) => {
        const next = extractParagraphs(e.currentTarget);
        onChangeParagraphs(next);
      }}
      className={cn(
        "prose-editor focus:outline-none",
        disabled && "opacity-60",
      )}
    />
  );
}

function extractParagraphs(el: HTMLElement): string[] {
  const parts: string[] = [];
  el.querySelectorAll("p").forEach((p) => {
    const t = (p.textContent ?? "").trim();
    if (t) parts.push(t);
  });
  if (parts.length === 0) {
    // Fallback: sem <p> filhos, quebra por \n.
    for (const line of (el.textContent ?? "").split(/\n+/)) {
      const t = line.trim();
      if (t) parts.push(t);
    }
  }
  return parts;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
