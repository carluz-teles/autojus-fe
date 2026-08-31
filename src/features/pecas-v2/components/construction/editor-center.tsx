"use client";

// Estágio PRONTA da Construção — editor WYSIWYG ÚNICO sobre o content_html.
//
// content_html é a FONTE-ÚNICA do texto da peça (o Tiptap é HTML-nativo; o PDF é
// gerado do mesmo HTML via chromedp → WYSIWYG real). Não há mais split em 3 nem
// duas representações a sincronizar: um RichEditor, um autosave (PUT /content-html).
//
// O Assistente aplica propostas direto no editor VIVO via editorRef (compartilhado
// pela construction-page) — reflete na hora e dispara o autosave.

import { Sparkles } from "lucide-react";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useSaveContentHtml } from "../../hooks/use-workflow";
import type { Draft } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor, type RichEditorHandle } from "../rich-editor/rich-editor";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  /** Ref pro RichEditor — compartilhado com o Assistente (aplicar propostas). */
  editorRef: RefObject<RichEditorHandle | null>;
  /** Refazer a minuta do zero (volta pro CTA "Gerar minuta"). */
  onRefazer: () => void;
}

export function EditorCenter({ draft, editorRef, onRefazer }: Props) {
  const saveHtml = useSaveContentHtml(draft.id);
  // Container do header pra onde a toolbar do RichEditor é portalizada (barra fixa
  // full-width — a formatação NÃO vive dentro da folha).
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);

  // HTML inicial = content_html (fonte-única). Fallback pro structured só quando
  // ainda vazio (peça recém-gerada). Memo por draft.id: depois do mount o editor é
  // a fonte VIVA — refetches não sobrescrevem o que o advogado está editando.
  const initialHtml = useMemo(
    () => {
      if (draft.contentHtml && draft.contentHtml.trim() !== "")
        return draft.contentHtml;
      return structuredToHtml({
        preamble: draft.preamble,
        sections: draft.sections,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.id],
  );

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scheduleSave = (html: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => saveHtml.mutate(html),
      AUTOSAVE_DEBOUNCE_MS,
    );
  };

  return (
    <div className="pb-10">
      {/* Barra de formatação FIXA no header (full-width) — toolbar portalizada. */}
      <div className="border-line sticky top-0 z-10 flex items-center gap-2 border-b bg-[color-mix(in_oklch,var(--panel)_94%,transparent)] px-4 py-1.5 backdrop-blur">
        <div ref={setToolbarEl} className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={onRefazer}
          className="border-primary/35 bg-primary/[0.07] text-primary hover:bg-primary/10 ml-auto inline-flex flex-none items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] font-medium"
        >
          <Sparkles className="size-[13px]" />
          Refazer com IA
        </button>
      </div>

      <div className="mx-auto my-7 max-w-[720px]">
        <div className="border-line bg-panel overflow-hidden rounded-md border shadow-[0_8px_30px_oklch(0.27_0.012_200/8%)]">
          {/* strip "Rascunho da IA" */}
          <div className="border-line2 text-primary flex items-center gap-2 border-b px-5 py-2.5 text-[11px]">
            <Sparkles className="size-[13px] flex-none" />
            Rascunho da IA — edite livremente, a autoria é sua
          </div>

          <div className="construction-editor px-10 pt-4 pb-6">
            <RichEditor
              ref={editorRef}
              html={initialHtml}
              toolbarContainer={toolbarEl}
              onChange={(html) => scheduleSave(html)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
