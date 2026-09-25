// @vitest-environment jsdom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Draft } from "../../types";
import type { RichEditorHandle } from "../rich-editor/rich-editor";
import { EditorCenter } from "./editor-center";

describe("EditorCenter authoritative clean hydration", () => {
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("mounts the full final body when its accepted hydration replaces an interim version, without emitting save", async () => {
    const ref = createRef<RichEditorHandle>();
    const onChange = vi.fn();
    const draft = {
      status: "DRAFT",
      contentHtml: "<p>Interim</p>",
      preamble: { paragraphs: [] },
      sections: [],
    } as Draft;
    await act(async () =>
      root.render(
        <EditorCenter
          key="accepted-1"
          draft={draft}
          editorRef={ref}
          regenerating={false}
          onChange={onChange}
        />,
      ),
    );
    expect(ref.current?.getHTML()).toContain("Interim");
    await act(async () =>
      root.render(
        <EditorCenter
          key="accepted-2"
          draft={{ ...draft, contentHtml: "<p>Final completo</p>" }}
          initialHtml="<p>Final completo</p>"
          editorRef={ref}
          regenerating={false}
          onChange={onChange}
        />,
      ),
    );
    expect(ref.current?.getHTML()).toContain("Final completo");
    expect(onChange).not.toHaveBeenCalled();
  });
});
