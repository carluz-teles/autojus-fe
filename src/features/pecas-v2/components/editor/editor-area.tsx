"use client";

// EditorArea (Fase A do editor rico) — passou de multi-card (Preâmbulo +
// SectionCard[]) pra um único RichEditor (Tiptap). A peça vira UMA folha
// A4 contínua com toolbar Word-like em cima. Autosave preservado via
// debounce: HTML muda → converte pra StructuredContent (adapter no cliente,
// intermediário até a Fase B) → dispara handlers existentes onSavePreamble/
// onSaveSection sem perder compat com o BE atual.

import { useEffect, useMemo, useRef, useState } from "react";

import { countChars, countWords } from "../../lib/count";
import type { Draft, DraftSection } from "../../types";
import { htmlToStructured, structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor } from "../rich-editor/rich-editor";
import { EditorBanner } from "./editor-banner";
import { EditorFooter } from "./editor-footer";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  onRefazerSection: (sectionId: string) => void; // preservado, mas sem UI dedicada na Fase A
  onAssumirAutoria: () => void;
  onRefazerDoZero: () => void;
  onSavePreamble: (paragraphs: string[]) => void;
  onSaveSection: (sectionId: string, paragraphs: string[]) => void;
  /** Trava a edição enquanto há um ajuste sendo revisado no painel lateral. */
  isPreviewActive?: boolean;
  /** Mantido por compat com a assinatura antiga; sem efeito na Fase A. */
  hideRefazerSection?: boolean;
}

export function EditorArea({
  draft,
  onAssumirAutoria,
  onRefazerDoZero,
  onSavePreamble,
  onSaveSection,
  isPreviewActive = false,
}: Props) {
  // HTML derivado da peça — recalcula apenas quando o SHAPE do JSON muda
  // (não quando o Tiptap emite novo HTML pra dentro). Sincroniza no load
  // e quando o parent troca a peça (aplicar iteração etc.).
  const initialHtml = useMemo(
    () =>
      structuredToHtml({
        preamble: draft.preamble,
        sections: draft.sections,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draftShapeKey(draft)],
  );

  // Stats reais vindas do Tiptap (mais precisas que contar do JSON).
  const [stats, setStats] = useState<{ words: number; chars: number }>(() => ({
    words: countWords(allText(draft)),
    chars: countChars(allText(draft)),
  }));

  // Autosave debounced. Precisa 1 timer só — a peça é salva inteira.
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
      const sc = htmlToStructured(html);
      onSavePreamble(sc.preamble.paragraphs);
      // Emit por section (id preservado via data-section-id ou derivado do texto).
      // Se o número/ordem de sections mudou (usuário deletou um <h2>), o BE
      // ainda recebe as remanescentes; sections órfãs ficam no backend até
      // futura reconciliação (débito Fase B).
      const byIdBefore = new Map(draft.sections.map((s) => [s.id, s]));
      for (const s of sc.sections) {
        const before = byIdBefore.get(s.id);
        if (!before || !arrEq(before.paragraphs, s.paragraphs)) {
          onSaveSection(s.id, s.paragraphs);
        }
      }
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

/** Chave que muda somente quando o SHAPE do JSON (não o texto) mudar —
 *  ids/roman/qty de sections + qty de parágrafos. Evita rebuild do HTML
 *  a cada tecla (Tiptap já mantém seu próprio state interno). */
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

function arrEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Reexport pra facilitar imports do painel (mantém contrato antigo).
export type { DraftSection };
