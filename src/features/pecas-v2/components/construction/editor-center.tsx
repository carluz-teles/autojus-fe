"use client";

// Estágio PRONTA da Construção — editor WYSIWYG com a seção "Do direito"
// composta pelas teses aprovadas inline.
//
// Layout (conforme o design):
//   • strip "Rascunho da IA — edite livremente, a autoria é sua"
//   • RichEditor topo   → preâmbulo + seção I (Dos fatos), editável
//   • DireitoTeses      → seção II, blocos de tese com aprovação inline
//   • RichEditor base   → seção III+ (Dos pedidos), editável
//
// Persistência: autosave debounced grava o content_html RECOMBINADO (topo +
// heading "II — DO DIREITO" + base) via PUT /content-html. Os blocos de tese
// NÃO entram no HTML persistido — a fonte da verdade das teses é o contrato
// Teses (estado por tese); o texto redigido da seção II é regenerado a partir
// das teses included quando a peça for consolidada no BE.
//
// Fonte do HTML inicial: contentHtml (Fase B) quando disponível; senão deriva
// de structured_content. O split em torno do heading "II" é refeito só quando
// o shape muda (não a cada tecla — cada RichEditor mantém seu próprio state).

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import type { EditorThesisAction } from "../../hooks/use-theses";
import { useSaveContentHtml } from "../../hooks/use-workflow";
import type { Draft, Thesis } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor } from "../rich-editor/rich-editor";
import { DireitoTeses } from "./direito-teses";
import { splitAroundDireito } from "./split-content";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  /** Teses da seção "Do direito" (state ≠ off), ordenadas. */
  direito: Thesis[];
  onThesisAction: (thesis: Thesis, action: EditorThesisAction) => void;
  /** thesisId com PATCH em voo. */
  pendingThesisId: string | null;
  /** Refazer a minuta do zero (volta pro CTA "Gerar minuta"). */
  onRefazer: () => void;
}

export function EditorCenter({
  draft,
  direito,
  onThesisAction,
  pendingThesisId,
  onRefazer,
}: Props) {
  const saveHtml = useSaveContentHtml(draft.id);

  // HTML inicial: contentHtml (Fase B) senão deriva de structured_content.
  const shapeKey = draftShapeKey(draft);
  const fullHtml = useMemo(
    () => {
      if (draft.contentHtml && draft.contentHtml.trim() !== "")
        return draft.contentHtml;
      return structuredToHtml({
        preamble: draft.preamble,
        sections: draft.sections,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft.id, draft.contentHtml, shapeKey],
  );

  const split = useMemo(() => splitAroundDireito(fullHtml), [fullHtml]);

  // Guarda o HTML editável de cada região pra recombinar no autosave.
  const topRef = useRef(split.top);
  const bottomRef = useRef(split.bottom);
  useEffect(() => {
    topRef.current = split.top;
    bottomRef.current = split.bottom;
  }, [split.top, split.bottom]);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const parts = [topRef.current];
      if (split.hasDireito)
        parts.push('<h2 data-roman="II">II — DO DIREITO</h2>');
      if (bottomRef.current) parts.push(bottomRef.current);
      saveHtml.mutate(parts.join("\n"));
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  return (
    <div className="pb-10">
      {/* barra de formatação sticky (o design) — ação "Refazer com IA" à direita.
          A formatação inline por região vem da toolbar sticky do RichEditor de
          topo (a base esconde a sua pra não duplicar). */}
      <div className="border-line sticky top-0 z-10 flex items-center gap-3 border-b bg-[color-mix(in_oklch,var(--panel)_94%,transparent)] px-4 py-2 backdrop-blur">
        <span className="text-fg3 text-[11.5px]">
          Formatação: selecione um trecho no rascunho de cima.
        </span>
        <button
          type="button"
          onClick={onRefazer}
          className="border-primary/35 bg-primary/[0.07] text-primary hover:bg-primary/10 ml-auto inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1.5 text-[11.5px] font-medium"
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

          {/* topo editável (preâmbulo + fatos) — mantém a toolbar do RichEditor */}
          <div className="construction-editor px-10 pt-4 pb-2">
            <RichEditor
              html={split.top}
              onChange={(html) => {
                topRef.current = html;
                scheduleSave();
              }}
            />
          </div>

          {/* seção II — teses com aprovação inline */}
          {split.hasDireito && (
            <DireitoTeses
              direito={direito}
              onAction={onThesisAction}
              pendingId={pendingThesisId}
            />
          )}

          {/* base editável (pedidos etc.) — toolbar escondida (uma barra basta) */}
          {split.bottom && (
            <div className="construction-editor px-10 pt-2 pb-6">
              <RichEditor
                html={split.bottom}
                hideToolbar
                onChange={(html) => {
                  bottomRef.current = html;
                  scheduleSave();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Chave que muda quando o SHAPE de structured_content muda — usada como dep
 *  do memo do HTML inicial (evita re-split a cada tecla). */
function draftShapeKey(d: Draft): string {
  const secs = d.sections
    .map((s) => `${s.id}:${s.paragraphs.length}`)
    .join("|");
  return `p${d.preamble.paragraphs.length}|s${secs}`;
}
