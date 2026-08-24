"use client";

// RichEditor — wrapper Tiptap com folha A4 visual + toolbar Word-like.
//
// Passa HTML como content e emite onChange(html) debounced. Todas as
// extensions relevantes pra peça jurídica estão registradas (marcas,
// alinhamento, cores, fonte, tamanho, tabelas). O CSS da .tiptap-a4-page
// simula uma folha A4 com margens forenses — o PDF final é gerado a
// partir do mesmo HTML no BE (Fase C).
//
// Readonly desliga edição sem esconder toolbar (útil no modo "preview
// do ajuste proposto" — o painel lateral controla).

import { EditorContent, useEditor } from "@tiptap/react";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextAlign } from "@tiptap/extension-text-align";
import { Color, FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";

import { forwardRef, useImperativeHandle } from "react";

import { RichToolbar } from "./rich-toolbar";
import "./rich-editor.css";

export interface RichEditorHandle {
  /** Append de HTML no fim do documento — usado pelo streaming da geração
   *  (useDraftStream chama pra cada chunk que chega). Bypass do onChange. */
  appendHtml(html: string): void;
  /** Substitui o conteúdo inteiro. */
  setHtml(html: string): void;
  /** Rola pro fim (útil enquanto o cursor da IA vai descendo). */
  scrollToEnd(): void;
}

interface Props {
  /** HTML inicial (Tiptap sincroniza no mount e quando muda `key`/`content`). */
  html: string;
  /** Chamado com o HTML atual em cada mudança (debounce responsabilidade do
   *  chamador — o Tiptap emite muito). */
  onChange: (html: string) => void;
  /** Emitido junto com onChange pro footer contar palavras/chars. */
  onStats?: (stats: { words: number; chars: number }) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { html, onChange, onStats, readOnly = false, placeholder },
  ref,
) {
  // Guarda ref pro último HTML aplicado externamente pra não disparar
  // ciclo (Tiptap → onUpdate → parent → prop → setContent → onUpdate…).
  const lastAppliedHtml = useRef(html);

  const editor = useEditor({
    editable: !readOnly,
    immediatelyRender: false, // Next.js SSR safety
    content: html,
    extensions: [
      StarterKit.configure({
        // deixamos undo/redo padrão do StarterKit; heading H1-H3 já embutido.
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    editorProps: {
      attributes: {
        class: "tiptap-content",
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate({ editor }) {
      const nextHtml = editor.getHTML();
      lastAppliedHtml.current = nextHtml;
      onChange(nextHtml);
      if (onStats) {
        const text = editor.getText();
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        onStats({ words, chars: text.length });
      }
    },
  });

  // Sincroniza content quando o parent troca a peça (ex.: aplicar iteração,
  // load inicial após fetch). Só re-aplica se realmente mudou — evita
  // resetar seleção/cursor a cada re-render irrelevante do parent.
  useEffect(() => {
    if (!editor) return;
    if (html === lastAppliedHtml.current) return;
    editor.commands.setContent(html, { emitUpdate: false });
    lastAppliedHtml.current = html;
  }, [editor, html]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useImperativeHandle(
    ref,
    () => ({
      appendHtml(chunk: string) {
        if (!editor) return;
        const end = editor.state.doc.content.size;
        editor.commands.insertContentAt(end, chunk, {
          updateSelection: false,
          parseOptions: { preserveWhitespace: "full" },
        });
      },
      setHtml(next: string) {
        if (!editor) return;
        lastAppliedHtml.current = next;
        editor.commands.setContent(next, { emitUpdate: false });
      },
      scrollToEnd() {
        const el = document.querySelector(".tiptap-a4-page");
        if (el) el.scrollTo({ top: (el as HTMLElement).scrollHeight, behavior: "smooth" });
      },
    }),
    [editor],
  );

  return (
    <div className="flex flex-col gap-3">
      <RichToolbar editor={editor} />
      <div className="tiptap-a4-page">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});
