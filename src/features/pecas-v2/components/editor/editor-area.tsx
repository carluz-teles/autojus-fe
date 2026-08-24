"use client";

// EditorArea (Fase A/B/C do editor rico) — RichEditor único com folha A4.
//
// Persistência (Fase B): source-of-truth é draft.contentHtml (coluna
// draft.content_html no BE). Quando é null (peça recém-gerada pela IA ou
// legacy), derivamos HTML de structured_content client-side pra popular
// o editor. Autosave grava direto em content_html via PUT /content-html.
//
// PDF (Fase C): o BE renderiza HTML → PDF via chromedp usando o mesmo
// content_html — bate visualmente com o WYSIWYG.

import { useEffect, useMemo, useRef, useState } from "react";

import { countChars, countWords } from "../../lib/count";
import { useSaveContentHtml } from "../../hooks/use-workflow";
import type { Draft, DraftSection } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor } from "../rich-editor/rich-editor";
import { EditorBanner } from "./editor-banner";
import { EditorFooter } from "./editor-footer";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  onRefazerSection: (sectionId: string) => void; // preservado, sem UI dedicada na Fase A
  onAssumirAutoria: () => void;
  onRefazerDoZero: () => void;
  onSavePreamble: (paragraphs: string[]) => void; // legacy — não usado mais
  onSaveSection: (sectionId: string, paragraphs: string[]) => void; // legacy — não usado mais
  /** Trava a edição enquanto há um ajuste sendo revisado no painel lateral. */
  isPreviewActive?: boolean;
  hideRefazerSection?: boolean;
}

export function EditorArea({
  draft,
  onAssumirAutoria,
  onRefazerDoZero,
  isPreviewActive = false,
}: Props) {
  const saveHtml = useSaveContentHtml(draft.id);

  // HTML inicial: preferir contentHtml (Fase B) quando disponível; senão
  // deriva de structured_content (peça recém-gerada). Sincroniza quando o
  // BE devolve conteúdo novo (fetch, iterate aplicado, etc.).
  const initialHtml = useMemo(
    () => {
      if (draft.contentHtml && draft.contentHtml.trim() !== "") return draft.contentHtml;
      return structuredToHtml({ preamble: draft.preamble, sections: draft.sections });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.id, draft.contentHtml, draftShapeKey(draft)],
  );

  const [stats, setStats] = useState<{ words: number; chars: number }>(() => ({
    words: countWords(allText(draft)),
    chars: countChars(allText(draft)),
  }));

  // Autosave debounced. Fase B: apenas 1 chamada por debounce que grava
  // o HTML inteiro — o BE não precisa mais parsear em sections.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const handleHtmlChange = (html: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveHtml.mutate(html);
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto bg-slate-50/60">
        {draft.authorship === "assistant" && (
          <EditorBanner
            thesisCount={draft.thesisCount}
            onRefazer={onRefazerDoZero}
            onAssumirAutoria={onAssumirAutoria}
          />
        )}

        <div className="mx-4 mt-4 mb-6">
          <RichEditor
            html={initialHtml}
            onChange={handleHtmlChange}
            onStats={setStats}
            readOnly={isPreviewActive}
            placeholder="Comece a escrever ou peça uma minuta à IA…"
          />
        </div>
      </div>

      <EditorFooter
        words={stats.words}
        chars={stats.chars}
        savedAtIso={draft.updatedAt}
      />
    </div>
  );
}

/** Chave que muda quando o SHAPE de structured_content mudar — usada só
 *  quando contentHtml é null (fallback). Evita rebuild do HTML a cada
 *  tecla enquanto o Tiptap mantém seu próprio state interno. */
function draftShapeKey(d: Draft): string {
  const secs = d.sections.map((s) => `${s.id}:${s.paragraphs.length}`).join("|");
  return `p${d.preamble.paragraphs.length}|s${secs}`;
}

function allText(draft: Draft): string {
  const parts: string[] = [];
  parts.push(...draft.preamble.paragraphs);
  for (const s of draft.sections) parts.push(...s.paragraphs);
  return parts.join(" ");
}

export type { DraftSection };
