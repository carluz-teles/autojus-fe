"use client";
import { type ReactNode, type RefObject, useState } from "react";

import type { Draft } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor, type RichEditorHandle } from "../rich-editor/rich-editor";
export function EditorCenter({
  draft,
  editorRef,
  regenerating,
  onChange,
  actions,
}: {
  draft: Draft;
  editorRef: RefObject<RichEditorHandle | null>;
  regenerating: boolean;
  onChange: (html: string) => void;
  actions?: ReactNode;
}) {
  // Cache refreshes must not replace unsaved local edits.

  const [initial] = useState(
    () =>
      draft.contentHtml ??
      structuredToHtml({ preamble: draft.preamble, sections: draft.sections }),
  );
  return (
    <EditorCanvas
      html={initial}
      editorRef={editorRef}
      onChange={onChange}
      readOnly={regenerating || draft.status !== "DRAFT"}
      actions={actions}
    />
  );
}

/** Shared editing surface: real bench and local visual prototype. */
export function EditorCanvas({
  html,
  editorRef,
  onChange,
  readOnly = false,
  actions,
}: {
  html: string;
  editorRef?: RefObject<RichEditorHandle | null>;
  onChange: (html: string) => void;
  readOnly?: boolean;
  actions?: ReactNode;
}) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  return (
    <div className="pb-12">
      <div className="bg-card sticky top-0 z-10 border-b px-3 py-3">
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 px-2">
          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.16em] uppercase">
            Documento de trabalho
          </p>
          <span className="text-muted-foreground text-xs">
            {readOnly ? "Somente leitura" : "Edição livre"}
          </span>
          {actions && (
            <div
              role="group"
              aria-label="Ações do documento"
              className="ml-auto flex items-center gap-1"
            >
              {actions}
            </div>
          )}
        </div>
        <div ref={setToolbar} />
      </div>
      <div className="mx-auto my-6 max-w-[880px] px-3 sm:px-5">
        <div className="bg-card overflow-hidden rounded-sm border shadow-sm">
          <div className="construction-editor min-h-[70vh] px-5 py-8 sm:px-9 sm:py-12">
            <RichEditor
              ref={editorRef}
              html={html}
              disableExternalSync
              toolbarContainer={toolbar}
              onChange={onChange}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
