"use client";

import { useMemo } from "react";

import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { cn } from "@/lib/utils";

type TeorContentProps = {
  content?: string | null;
  emptyMessage?: string;
  className?: string;
  /** Desative em trechos clicáveis para evitar links aninhados ou cortados. */
  allowLinks?: boolean;
};

/** Apresentação compartilhada do teor, recebido como HTML de tribunal ou texto. */
export function TeorContent({
  content,
  emptyMessage = "Teor integral indisponível.",
  className,
  allowLinks = true,
}: TeorContentProps) {
  const formatted = useMemo(() => {
    const raw = content?.trim() || "";
    // Comparações como "valor < 100" são texto; documentos e fragmentos são HTML.
    const isHtml = /<\/?[a-z][^>]*>|<!doctype\b/i.test(raw);
    if (!isHtml) return { text: raw, html: null };
    const safe = sanitizeContentHtml(raw);
    const html = allowLinks ? safe : safe.replace(/<\/?a\b[^>]*>/gi, "");
    const hasText = html.replace(/<[^>]*>|&nbsp;|&#160;|&#xA0;/gi, "").trim();
    return { text: "", html: hasText ? html : null };
  }, [content, allowLinks]);

  const empty = !formatted.text && !formatted.html;
  return (
    <div
      className={cn(
        "prose-intimacao text-foreground min-w-0 text-sm leading-[1.85] [overflow-wrap:anywhere] break-words [&_table]:w-full [&_table]:table-fixed",
        empty && "text-muted-foreground",
        className,
      )}
    >
      {formatted.html ? (
        <div dangerouslySetInnerHTML={{ __html: formatted.html }} />
      ) : (
        <span className="whitespace-pre-wrap">
          {formatted.text || emptyMessage}
        </span>
      )}
    </div>
  );
}
