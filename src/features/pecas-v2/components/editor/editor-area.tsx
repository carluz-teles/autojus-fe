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

import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";

import { useDraftStream } from "../../hooks/use-draft-stream";
import { useSaveContentHtml } from "../../hooks/use-workflow";
import { countChars, countWords } from "../../lib/count";
import type { Draft, DraftSection } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor, type RichEditorHandle } from "../rich-editor/rich-editor";
import { EditorBanner } from "./editor-banner";
import { EditorFooter } from "./editor-footer";

// Configuração do marked (client-side): GFM ligado (tables), breaks OFF (o LLM
// já separa parágrafos com linha em branco — CommonMark padrão). Rodamos síncrono
// (sem highlighter async) porque o parse acontece a cada rAF durante o streaming
// e precisa retornar de imediato pra próxima renderização do Tiptap.
marked.setOptions({ gfm: true, breaks: false });

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
  /** Trigger de highlight: quando `nonce` muda, o RichEditor localiza o h2
   *  cujo texto começa com `roman` e aplica a animação de fade dourado.
   *  O ConstrucaoPage seta isso ao aceitar uma iteração pra sinalizar
   *  visualmente onde a mudança caiu. */
  highlightTrigger?: { roman: string; nonce: number };
}

export function EditorArea({
  draft,
  onAssumirAutoria,
  onRefazerDoZero,
  isPreviewActive = false,
  highlightTrigger,
}: Props) {
  const saveHtml = useSaveContentHtml(draft.id);
  const editorRef = useRef<RichEditorHandle>(null);

  // Streaming da geração: quando saga=EXTRACTING, o RichEditor entra em
  // modo read-only e a IA "digita" a peça. Cada chunk vem via useDraftStream
  // e é appended via editor.appendHtml. Quando termina (DRAFTED), invalida
  // o cache do draft pra sincronizar com o content_html persistido.
  const isStreaming = draft.sagaState === "EXTRACTING";
  const [streamStarted, setStreamStarted] = useState(false);
  const [streamDone, setStreamDone] = useState(false);
  // Ao trocar de peça, zera o flag de streamDone pra reengatar o SSE da nova.

  useEffect(() => {
    setStreamDone(false);
  }, [draft.id]);

  useDraftStream(draft.id, {
    enabled: isStreaming && !streamDone,
    onProgress: (fullMarkdown) => {
      if (!streamStarted) {
        setStreamStarted(true);
      }
      // Converte markdown acumulado → HTML e substitui o conteúdo do editor
      // por completo (setHtml). É o mesmo padrão que apps de LLM streaming
      // (ChatGPT/Claude) usam: re-renderizar full a cada frame é barato porque
      // o hook throttla via rAF, e evita corrupção de HTML incompleto.
      const html = marked.parse(fullMarkdown, { async: false }) as string;
      editorRef.current?.setHtml(html);
      editorRef.current?.scrollToEnd();
    },
    onDone: () => {
      setStreamStarted(false);
      setStreamDone(true);
      // NÃO invalida queries — refetch traria content_html final que o
      // useEffect do RichEditor tentaria aplicar por cima do editor. O polling
      // do useDraft já vai pegar saga=DRAFTED naturalmente (para o polling).
    },
  });

  // "Redigindo em tempo real" deriva do state local, não da saga do BE — o
  // polling do useDraft roda a cada 1s, então quando o SSE fecha (onDone) o
  // saga_state pode continuar EXTRACTING no cache por até 1s. Usar o flag
  // local mata o label imediatamente ao fim do stream.
  const showStreamingIndicator = isStreaming && !streamDone;

  // Highlight pós-iteração: ConstrucaoPage bump `highlightTrigger.nonce` no
  // click "Aplicar" (junto com o update otimista do cache). Como o setQueryData
  // é síncrono, quando este useEffect roda o `draft.contentHtml` (e portanto
  // o `initialHtml` do RichEditor) já são o novo. 2 rAFs garantem que o
  // setContent do RichEditor terminou de pintar o DOM antes de destacar.
  const lastNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!highlightTrigger || !highlightTrigger.roman) return;
    if (lastNonceRef.current === highlightTrigger.nonce) return;
    lastNonceRef.current = highlightTrigger.nonce;
    const roman = highlightTrigger.roman;
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        editorRef.current?.highlightSection(roman);
      });
    });
    return () => cancelAnimationFrame(raf1);
  }, [highlightTrigger]);

  // HTML inicial: preferir contentHtml (Fase B) quando disponível; senão
  // deriva de structured_content (peça recém-gerada). Sincroniza quando o
  // BE devolve conteúdo novo (fetch, iterate aplicado, etc.).
  const shapeKey = draftShapeKey(draft);
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
    [draft.id, draft.contentHtml, shapeKey],
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
    // Durante o streaming, o Tiptap está read-only mas o setHtml("") inicial
    // ainda dispara onChange — armar o timer aqui grava HTML vazio por cima
    // do content_html que o worker vai persistir.
    if (isStreaming) return;
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
            ref={editorRef}
            html={initialHtml}
            onChange={handleHtmlChange}
            onStats={setStats}
            readOnly={isPreviewActive || showStreamingIndicator}
            placeholder={
              showStreamingIndicator
                ? "A IA está redigindo…"
                : "Comece a escrever ou peça uma minuta à IA…"
            }
            disableExternalSync={showStreamingIndicator}
          />
          {showStreamingIndicator && (
            <div className="text-muted-foreground mt-2 flex items-center gap-2 text-[12.5px]">
              <span className="bg-primary inline-block h-2 w-2 animate-pulse rounded-full" />
              <span>Redigindo em tempo real…</span>
            </div>
          )}
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
  const secs = d.sections
    .map((s) => `${s.id}:${s.paragraphs.length}`)
    .join("|");
  return `p${d.preamble.paragraphs.length}|s${secs}`;
}

function allText(draft: Draft): string {
  const parts: string[] = [];
  parts.push(...draft.preamble.paragraphs);
  for (const s of draft.sections) parts.push(...s.paragraphs);
  return parts.join(" ");
}

export type { DraftSection };
