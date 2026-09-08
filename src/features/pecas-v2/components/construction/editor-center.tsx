"use client";
import { type RefObject, useState } from "react";

import type { Draft } from "../../types";
import { structuredToHtml } from "../rich-editor/html-adapter";
import { RichEditor, type RichEditorHandle } from "../rich-editor/rich-editor";
export function EditorCenter({
  draft,
  editorRef,
  regenerating,
  onChange,
}: {
  draft: Draft;
  editorRef: RefObject<RichEditorHandle | null>;
  regenerating: boolean;
  onChange: (html: string) => void;
}) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null);
  // Cache refreshes must not replace unsaved local edits.

  const [initial] = useState(
    () =>
      draft.contentHtml ??
      structuredToHtml({ preamble: draft.preamble, sections: draft.sections }),
  );
  return (
    <div className="pb-10">
      <div className="bg-background sticky top-0 z-10 border-b px-3 py-2">
        <div ref={setToolbar} />
      </div>
      <div className="mx-auto my-5 max-w-[820px] px-3 sm:px-6">
        <div className="bg-card overflow-hidden rounded-md border shadow-sm">
          <div className="construction-editor px-4 py-6 sm:px-10">
            <RichEditor
              ref={editorRef}
              html={initial}
              disableExternalSync
              toolbarContainer={toolbar}
              onChange={onChange}
              readOnly={regenerating || draft.status !== "DRAFT"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
