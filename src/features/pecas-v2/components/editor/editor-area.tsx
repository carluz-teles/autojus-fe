"use client";

// Composição do editor: toolbar → banner (se autoria=assistant) → preâmbulo +
// section cards → footer. Recebe do pai (ConstrucaoPage) os handlers de:
//   - refazer seção (foca painel Iterar)
//   - assumir autoria (stub por ora)
//   - refazer do zero (abre dialog)
//   - autosave (debounce próprio aqui)
//
// Quando `isPreviewActive` é true, todo o editor entra em read-only — o diff
// e a decisão de aceitar/aplicar vivem no painel lateral (TabAjusteProposto).

import { useEffect, useMemo, useRef } from "react";

import { countChars, countWords } from "../../lib/count";
import type { Draft, DraftSection } from "../../types";
import { EditorBanner } from "./editor-banner";
import { EditorFooter } from "./editor-footer";
import { EditorToolbar } from "./editor-toolbar";
import { PreambleBlock, SectionCard } from "./section-card";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  onRefazerSection: (sectionId: string) => void;
  onAssumirAutoria: () => void;
  onRefazerDoZero: () => void;
  onSavePreamble: (paragraphs: string[]) => void;
  onSaveSection: (sectionId: string, paragraphs: string[]) => void;
  /** Trava a edição enquanto há um ajuste sendo revisado no painel lateral. */
  isPreviewActive?: boolean;
  /** Oculta o link "Refazer seção" dos section-cards. Usado quando o advogado
   *  assumiu autoria (nesse modo o painel Iterar não existe — a ação não faz
   *  sentido). */
  hideRefazerSection?: boolean;
}

export function EditorArea({
  draft,
  onRefazerSection,
  onAssumirAutoria,
  onRefazerDoZero,
  onSavePreamble,
  onSaveSection,
  isPreviewActive = false,
  hideRefazerSection = false,
}: Props) {
  // Autosave debounce por chave (preâmbulo + cada seção). Um timer por chave.
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
    };
  }, []);

  const scheduleSave = (key: string, fn: () => void) => {
    const map = timers.current;
    const existing = map.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      fn();
      map.delete(key);
    }, AUTOSAVE_DEBOUNCE_MS);
    map.set(key, t);
  };

  const words = useMemo(() => countWords(allText(draft)), [draft]);
  const chars = useMemo(() => countChars(allText(draft)), [draft]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorToolbar />

      <div className="flex-1 overflow-y-auto">
        {draft.authorship === "assistant" && (
          <EditorBanner
            thesisCount={draft.thesisCount}
            onRefazer={onRefazerDoZero}
            onAssumirAutoria={onAssumirAutoria}
          />
        )}

        <div className="mx-8 my-6 flex max-w-[820px] flex-col gap-4">
          <PreambleBlock
            paragraphs={draft.preamble.paragraphs}
            disabled={isPreviewActive}
            onChangeParagraphs={(paragraphs) =>
              scheduleSave("preamble", () => onSavePreamble(paragraphs))
            }
          />

          {draft.sections.map((s) => (
            <SectionCard
              key={s.id}
              roman={s.roman}
              title={s.title}
              paragraphs={s.paragraphs}
              onRefazer={() => onRefazerSection(s.id)}
              onChangeParagraphs={(paragraphs) =>
                scheduleSave(`section:${s.id}`, () =>
                  onSaveSection(s.id, paragraphs),
                )
              }
              disabled={isPreviewActive}
              hideRefazer={hideRefazerSection}
            />
          ))}
        </div>
      </div>

      <EditorFooter words={words} chars={chars} savedAtIso={draft.updatedAt} />
    </div>
  );
}

function allText(draft: Draft): string {
  const parts: string[] = [];
  parts.push(...draft.preamble.paragraphs);
  for (const s of draft.sections) {
    parts.push(...s.paragraphs);
  }
  return parts.join(" ");
}

// Reexport pra facilitar imports do painel.
export type { DraftSection };
