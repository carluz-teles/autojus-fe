"use client";

// Preview read-only da peça (usado nas telas Assinatura + Protocolo). Renderiza
// o `content_html` do BE (mesmo HTML que vai virar PDF via chromedp) sanitizado
// via dompurify — assim o preview bate visualmente com o que o advogado vai
// receber como PDF final: cores, negrito, blockquote, tabelas, alinhamentos,
// listas etc. O CSS `.tiptap-a4-page` do editor rico é reaproveitado pra manter
// a folha A4 com margens forenses.
//
// Fallback: quando `contentHtml` está vazio (peça legacy só com structured_content),
// derivamos HTML de preamble/sections via structuredToHtml — mantém compat.

import "./rich-editor/rich-editor.css";

import DOMPurify from "isomorphic-dompurify";
import { useMemo } from "react";

import type { DraftPreamble, DraftSection } from "../types";
import { structuredToHtml } from "./rich-editor/html-adapter";

interface Props {
  title: string;
  preamble: DraftPreamble;
  sections: DraftSection[];
  contentHtml?: string | null;
}

// Config do sanitizer: aceita elementos usados pelo editor rico + atributos de
// estilo que o Tiptap emite (text-align, color inline).
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "span",
    "div",
  ],
  ALLOWED_ATTR: ["style", "class", "align", "colspan", "rowspan"],
};

export function PecaPreview({ title, preamble, sections, contentHtml }: Props) {
  const html = useMemo(() => {
    const raw =
      contentHtml && contentHtml.trim() !== ""
        ? contentHtml
        : structuredToHtml({ preamble, sections });
    return DOMPurify.sanitize(raw, SANITIZE_CONFIG);
  }, [contentHtml, preamble, sections]);

  return (
    <article className="mx-auto max-w-[calc(210mm+48px)] px-4 py-4">
      <h1 className="font-display text-foreground mb-4 text-2xl leading-tight font-medium">
        {title}
      </h1>
      <div className="tiptap-a4-page">
        {}
        <div
          className="ProseMirror tiptap-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
