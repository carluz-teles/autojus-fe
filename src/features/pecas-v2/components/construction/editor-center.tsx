"use client";

// Estágio PRONTA da Construção — editor WYSIWYG ÚNICO sobre o content_html.
//
// content_html é a FONTE-ÚNICA do texto da peça (o Tiptap é HTML-nativo; o PDF é
// gerado do mesmo HTML via chromedp → WYSIWYG real). Não há mais split em 3 nem
// duas representações a sincronizar: um RichEditor, um autosave (PUT /content-html).
//
// O Assistente aplica propostas direto no editor VIVO via editorRef (compartilhado
// pela construction-page) — reflete na hora e dispara o autosave.

import { Loader2, Sparkles } from "lucide-react";
import { marked } from "marked";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";

import { useDraftStream } from "../../hooks/use-draft-stream";
import type { EditorThesisAction } from "../../hooks/use-theses";
import { useSaveContentHtml } from "../../hooks/use-workflow";
import type { Draft, Thesis } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { romansFromHeadings } from "../rich-editor/pending-removal";
import { RichEditor, type RichEditorHandle } from "../rich-editor/rich-editor";
import { DireitoTeses } from "./direito-teses";

const AUTOSAVE_DEBOUNCE_MS = 1200;

interface Props {
  draft: Draft;
  /** Ref pro RichEditor — compartilhado com o Assistente (aplicar propostas). */
  editorRef: RefObject<RichEditorHandle | null>;
  /** Refazer a minuta do zero (volta pro CTA "Gerar minuta"). */
  onRefazer: () => void;
  /** Teses da seção "Do direito" (state ≠ off) — a moldura de aprovação/remoção. */
  direito: Thesis[];
  /** Ação de aprovação inline sobre uma tese (approve/discard/approveRemoval/keep/remove). */
  onThesisAction: (thesis: Thesis, action: EditorThesisAction) => void;
  /** thesisId com PATCH de estado em voo (desabilita os botões da moldura). */
  pendingThesisId: string | null;
  /** Regeração em curso (mudou o conjunto de teses): a folha streama o novo texto
   *  IN LOCO, sem trocar o centro — o shell (rails/toolbar/assistente) permanece. */
  regenerating: boolean;
}

// GFM ligado, breaks OFF — o LLM já separa parágrafos (CommonMark). Parse síncrono
// por frame durante o stream da regeração.
marked.setOptions({ gfm: true, breaks: false });

export function EditorCenter({
  draft,
  editorRef,
  onRefazer,
  direito,
  onThesisAction,
  pendingThesisId,
  regenerating,
}: Props) {
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

  // Só as teses com proposta PENDENTE entram na moldura de confirmação — as
  // incluídas já estão no texto da peça (não se re-lista o miolo aqui).
  const pendentesDeTese = direito.filter(
    (t) => t.state === "pending_add" || t.state === "pending_remove",
  );

  // Romanos das seções cujo texto será removido (teses em pending_remove) — o
  // editor marca esses trechos IN LOCO (tachado/vermelho), em vez de duplicá-los
  // num card. Deriva do segmento (thesis↔trecho) persistido na geração.
  const removalRomans = useMemo(
    () =>
      romansFromHeadings(
        direito
          .filter((t) => t.state === "pending_remove")
          .flatMap((t) => t.segments.map((s) => s.heading)),
      ),
    [direito],
  );

  // Streaming da REGERAÇÃO: enquanto `regenerating`, o SSE devolve o markdown novo
  // e a folha mostra o texto sendo reescrito ao vivo (mesmo canal da 1ª geração).
  const [streamHtml, setStreamHtml] = useState("");
  const streamScrollRef = useRef<HTMLDivElement>(null);
  useDraftStream(draft.id, {
    enabled: regenerating,
    onProgress: (md) =>
      setStreamHtml(marked.parse(md, { async: false }) as string),
  });
  useEffect(() => {
    if (streamHtml && streamScrollRef.current) {
      streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
    }
  }, [streamHtml]);

  // Ao TERMINAR a regeração (regenerating true→false), carrega o content_html novo
  // na folha viva (setHtml, sem emitir update → não vira autosave) e limpa o stream.
  const wasRegenerating = useRef(false);
  useEffect(() => {
    if (wasRegenerating.current && !regenerating) {
      if (draft.contentHtml) editorRef.current?.setHtml(draft.contentHtml);
      setStreamHtml("");
    }
    wasRegenerating.current = regenerating;
  }, [regenerating, draft.contentHtml, editorRef]);

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

          <div className="construction-editor relative px-10 pt-4 pb-6">
            <RichEditor
              ref={editorRef}
              html={initialHtml}
              toolbarContainer={toolbarEl}
              onChange={(html) => scheduleSave(html)}
              removalRomans={removalRomans}
              readOnly={regenerating}
            />
            {regenerating && (
              <div className="bg-panel/97 absolute inset-0 z-20 flex flex-col px-10 pt-4 pb-6 backdrop-blur-[1px]">
                <div className="text-primary mb-4 flex items-center gap-2 text-[12.5px]">
                  <Loader2 className="size-[15px] animate-spin" />
                  Reescrevendo a peça com o novo conjunto de teses…
                </div>
                {streamHtml.trim().length > 0 ? (
                  <div
                    ref={streamScrollRef}
                    className="font-display flex-1 overflow-y-auto text-[14.5px] leading-[1.9] [&_h1]:mb-3 [&_h1]:text-[18px] [&_h1]:font-semibold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3.5 [&_ol]:pl-6 [&_p]:mb-3.5 [&_p]:text-justify [&_ul]:mb-3.5 [&_ul]:pl-6"
                    dangerouslySetInnerHTML={{ __html: streamHtml }}
                  />
                ) : (
                  <div aria-hidden className="flex flex-col gap-3.5">
                    {[92, 78, 96, 64, 88, 72].map((w, i) => (
                      <div
                        key={i}
                        className="bg-hover h-3 animate-pulse rounded"
                        style={{ width: `${w}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Moldura de CONFIRMAÇÃO — só as teses com proposta PENDENTE (incluir/
              remover). As teses já incluídas vivem no texto da peça (content_html)
              — não são re-listadas aqui (evita duplicar o miolo). A remoção é
              INICIADA no rail (clicar numa tese incluída → pending_remove); aqui só
              se CONFIRMA (Aprovar/Descartar · Aprovar remoção/Manter). */}
          {!regenerating && pendentesDeTese.length > 0 && (
            <div className="border-line2 border-t pt-4">
              <DireitoTeses
                direito={pendentesDeTese}
                onAction={onThesisAction}
                pendingId={pendingThesisId}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
