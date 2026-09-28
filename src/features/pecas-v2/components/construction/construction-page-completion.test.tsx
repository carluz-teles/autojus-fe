// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConstructionPage } from "./construction-page";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  flush: vi.fn(),
  draft: null as Record<string, unknown> | null,
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("../../hooks/use-construction", () => ({
  useConstruction: () => ({
    draft: mocks.draft,
    theses: {
      theses: [],
      selectedCount: 0,
      selectedIds: [],
      isLoading: false,
      isError: false,
      isRegenerating: false,
    },
    stage: "pronta",
    hasOrigin: true,
    hasTeor: true,
    isLoading: false,
    isError: false,
    isGenerating: false,
    regenerating: false,
  }),
}));
vi.mock("../../hooks/use-content-save", () => ({
  useContentSave: () => ({
    state: "saved",
    flush: mocks.flush,
    queue: { dirty: false, revision: "r1" },
    change: vi.fn(),
  }),
}));
vi.mock("@/features/filing/preparation-popover", () => ({
  PreparationWorkspace: ({
    children,
  }: {
    children: (args: Record<string, unknown>) => React.ReactNode;
  }) => children({ trigger: null, attachments: null, status: null }),
}));
vi.mock("@/features/filing/filing-status", () => ({
  FilingStatusNotice: () => null,
}));
vi.mock("../pregen/top-bar", () => ({
  TopBar: ({ actions }: { actions: React.ReactNode }) => <div>{actions}</div>,
}));
vi.mock("../pregen/context-rail", () => ({ ContextRail: () => null }));
vi.mock("./assistente-panel", () => ({ AssistentePanel: () => null }));
vi.mock("./editor-center", () => ({ EditorCenter: () => null }));
vi.mock("./gerando-center", () => ({ GerandoCenter: () => null }));
vi.mock("./pdf-drawer", () => ({ PdfDrawer: () => null }));
vi.mock("./pdf-preview", () => ({ PdfPreview: () => null }));
vi.mock("./teor-drawer", () => ({ TeorDrawer: () => null }));
vi.mock("./source-actions", () => ({ SourceActions: () => null }));
vi.mock("./providence-context", () => ({ ProvidenceContext: () => null }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("ConstructionPage completion pending", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  function complete() {
    const buttons = [...document.querySelectorAll("button")];
    const found = buttons.filter(
      (button) => button.textContent?.trim() === "Concluir elaboração",
    );
    return found.at(-1)!;
  }
  async function click(element: HTMLElement) {
    await act(async () => element.click());
  }
  async function open() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <ConstructionPage id="qa" />
        </QueryClientProvider>,
      ),
    );
    await click(complete());
    await click(document.querySelector("#completion-confirm") as HTMLElement);
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    mocks.api.mockReset().mockResolvedValue({ data: {} });
    mocks.flush.mockReset().mockResolvedValue(undefined);
    mocks.draft = {
      id: "qa",
      title: "QA",
      pieceType: "MOTION",
      status: "DRAFT",
      sagaState: "DRAFTED",
      contentHtml: "<p>Texto</p>",
      contentRevision: "r1",
      intimation: { id: "i", teor: "Ato", title: "Ato", publishedAt: "" },
      process: { cnj: "qa", courtRecordId: "qa" },
      deadline: { endDate: "" },
      partyGroups: [],
      processDocuments: [],
      attachments: [],
      providences: [],
      preamble: { paragraphs: [] },
      sections: [],
      sentToSigningAt: null,
    };
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    vi.unstubAllGlobals();
  });

  it("locks before flush so two same-render clicks send only one completion POST", async () => {
    const waiting = deferred<void>();
    mocks.flush.mockReturnValue(waiting.promise);
    await open();
    const button = complete();
    await act(async () => {
      button.click();
      button.click();
    });
    expect(mocks.flush).toHaveBeenCalledTimes(1);
    expect(mocks.api).not.toHaveBeenCalled();
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    expect(button.disabled).toBe(true);
    expect(
      (document.querySelector("#completion-confirm") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    waiting.resolve();
    await act(async () => {
      await waiting.promise;
    });
    expect(mocks.api).toHaveBeenCalledExactlyOnceWith(
      "/v1/pecas/qa/enviar-para-assinatura",
      { method: "POST" },
    );
  });

  it("releases the guard after a failed POST and keeps the confirmation available for retry", async () => {
    mocks.api.mockRejectedValueOnce(new Error("network"));
    await open();
    await click(complete());
    expect(mocks.api).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
    expect(complete().disabled).toBe(false);
    await click(complete());
    expect(mocks.api).toHaveBeenCalledTimes(2);
    expect(document.querySelector("[role=dialog]")).toBeNull();
  });
});
