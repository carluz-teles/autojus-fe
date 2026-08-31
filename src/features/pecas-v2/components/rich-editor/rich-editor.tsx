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

import "./rich-editor.css";

import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { TextAlign } from "@tiptap/extension-text-align";
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";

import { applySectionChangeToHtml } from "../../lib/apply-change-html";
import { RichToolbar } from "./rich-toolbar";

export interface RichEditorHandle {
  /** Append de HTML no fim do documento — usado pelo streaming da geração
   *  (useDraftStream chama pra cada chunk que chega). Bypass do onChange. */
  appendHtml(html: string): void;
  /** Substitui o conteúdo inteiro. */
  setHtml(html: string): void;
  /** Rola pro fim (útil enquanto o cursor da IA vai descendo). */
  scrollToEnd(): void;
  /** Destaca visualmente a seção cujo heading começa com o algarismo romano
   *  informado (ex.: "I" bate em `<h2>I — DOS FATOS</h2>`). O highlight é
   *  aplicado do próprio h2 até imediatamente antes do próximo heading, e
   *  desaparece sozinho via animação CSS (~2.5s). Chamado pelo EditorArea
   *  logo após aceitar uma iteração pra sinalizar onde a mudança caiu. */
  highlightSection(roman: string): void;
  /** Aplica uma proposta do Assistente NO EDITOR VIVO: troca o corpo da SEÇÃO
   *  (ancorada pelo heading do romano) pelos novos parágrafos, e emite update
   *  (→ autosave). Devolve false quando a seção não foi encontrada — não corrompe. */
  applySectionChange(sectionRoman: string, newParagraphs: string[]): boolean;
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
  /** Quando true, ignora mudanças na prop `html` (o editor local vira a
   *  única source of truth). Usado durante e após streaming da geração —
   *  o parent congela o sync externo pra que o refetch com content_html
   *  final não sobrescreva os chunks já renderizados via appendHtml. */
  disableExternalSync?: boolean;
  /** Esconde a toolbar embutida — usado quando o parent já provê uma barra de
   *  formatação própria (ex.: editor da Construção com barra sticky única). */
  hideToolbar?: boolean;
  /** Quando fornecido, a toolbar é PORTALIZADA para este container (ex.: a barra
   *  fixa no HEADER da Construção) em vez de renderizar inline acima da folha. */
  toolbarContainer?: HTMLElement | null;
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(
  function RichEditor(
    {
      html,
      onChange,
      onStats,
      readOnly = false,
      placeholder,
      disableExternalSync = false,
      hideToolbar = false,
      toolbarContainer,
    },
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
      if (disableExternalSync) return;
      if (html === lastAppliedHtml.current) return;
      editor.commands.setContent(html, { emitUpdate: false });
      lastAppliedHtml.current = html;
    }, [editor, html, disableExternalSync]);

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
          if (el)
            el.scrollTo({
              top: (el as HTMLElement).scrollHeight,
              behavior: "smooth",
            });
        },
        applySectionChange(sectionRoman, newParagraphs) {
          if (!editor) return false;
          const current = editor.getHTML();
          const next = applySectionChangeToHtml(
            current,
            sectionRoman,
            newParagraphs,
          );
          if (next === current) return false;
          // emitUpdate → onUpdate → onChange do parent → autosave do content_html.
          editor.commands.setContent(next, { emitUpdate: true });
          lastAppliedHtml.current = next;
          return true;
        },
        highlightSection(roman: string) {
          if (!roman) return;
          // O ProseMirror reconcilia o DOM e remove qualquer classe que a
          // gente adicione direto nos nós dele — então NÃO dá pra usar
          // classList.add no h2. Solução: desenhamos um overlay <div>
          // absoluto dentro do container A4 (fora do ProseMirror), com as
          // dimensões calculadas a partir dos boundingClientRects do heading
          // + siblings. O overlay tem sua própria animação e é removido
          // após 4s. Robusto a qualquer re-render do editor.
          requestAnimationFrame(() => {
            const page = document.querySelector<HTMLElement>(".tiptap-a4-page");
            const pm = document.querySelector<HTMLElement>(".ProseMirror");
            if (!page || !pm) return;
            const headings = Array.from(pm.querySelectorAll("h1, h2, h3"));
            const prefix = new RegExp(`^${roman}\\b`);
            const target = headings.find((h) =>
              prefix.test((h.textContent ?? "").trim()),
            ) as HTMLElement | undefined;
            if (!target) return;
            const els: HTMLElement[] = [target];
            let sib = target.nextElementSibling as HTMLElement | null;
            while (sib && !/^H[1-3]$/.test(sib.tagName)) {
              els.push(sib);
              sib = sib.nextElementSibling as HTMLElement | null;
            }
            // Bounding do bloco inteiro (top do heading até bottom do último
            // sibling). Coords relativas ao container `.tiptap-a4-page`.
            const pageRect = page.getBoundingClientRect();
            const firstRect = els[0].getBoundingClientRect();
            const lastRect = els[els.length - 1].getBoundingClientRect();
            const top = firstRect.top - pageRect.top - 4;
            const bottom = lastRect.bottom - pageRect.top + 4;
            const overlay = document.createElement("div");
            overlay.className = "section-highlight-overlay";
            overlay.style.top = `${top}px`;
            overlay.style.height = `${bottom - top}px`;
            if (page.style.position === "") page.style.position = "relative";
            page.appendChild(overlay);
            target.scrollIntoView({ behavior: "smooth", block: "center" });
            window.setTimeout(() => overlay.remove(), 4100);
          });
        },
      }),
      [editor],
    );

    // A toolbar pode ir inline (acima da folha) OU portalizada pro header da
    // Construção (barra fixa full-width) — nunca dentro da folha nesse caso.
    const showInlineToolbar = !hideToolbar && !toolbarContainer;
    return (
      <div className="flex flex-col gap-3">
        {showInlineToolbar && <RichToolbar editor={editor} />}
        {!hideToolbar && toolbarContainer && editor
          ? createPortal(<RichToolbar editor={editor} />, toolbarContainer)
          : null}
        <div className="tiptap-a4-page">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  },
);
