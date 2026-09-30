// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Draft } from "../types";
import { usePdfExport } from "./use-pdf-export";

const mocks = vi.hoisted(() => ({
  orgId: "office-a",
  api: vi.fn(),
  getBlob: vi.fn(),
  flush: vi.fn(),
  getDraft: vi.fn(),
  legacy: vi.fn(),
  render: vi.fn(),
  getRender: vi.fn(),
  getDefault: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ orgId: mocks.orgId }) }));
vi.mock("@/lib/api/use-api", () => ({
  useApi: () => mocks.api,
  usePresignedStorage: () => ({ getBlob: mocks.getBlob }),
}));
vi.mock("@/lib/auth/organization-transition", () => ({
  subscribeTransition: () => () => {},
}));
vi.mock(
  "@/features/document-templates/services/document-templates.service",
  () => ({
    getDocumentTemplateDefault: mocks.getDefault,
  }),
);
vi.mock("../services/pecas-v2.service", () => ({
  getDraft: mocks.getDraft,
  exportDraftPDF: mocks.legacy,
  renderDraftPDF: mocks.render,
  getDocumentRender: mocks.getRender,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toast } }));

const originalURL = {
  create: URL.createObjectURL,
  revoke: URL.revokeObjectURL,
};
const draft = {
  id: "piece-1",
  status: "DRAFT",
  currentVersionId: "v1",
  contentRevision: "r1",
  contentHtml: "<p>Text</p>",
  updatedAt: "2026-01-01",
  pieceType: "MOTION",
  process: {},
  parties: [],
  preamble: {},
  sections: [],
  qualityAuthorization: { allowed: true, reasonCode: "" },
  signedPDFURL: null,
} as unknown as Draft;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
}

function Probe({ value }: { value: Draft }) {
  const pdf = usePdfExport("piece-1", value, mocks.flush);
  return (
    <>
      <button onClick={() => void pdf.exportPDF()}>export</button>
      <span data-testid="result">
        {pdf.artifact?.renderId ?? (pdf.artifact ? "legacy" : "empty")}
      </span>
      <span data-testid="open">{String(pdf.open)}</span>
    </>
  );
}

describe("PDF export integration", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  async function show(value = draft) {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe value={value} />
        </QueryClientProvider>,
      ),
    );
  }
  async function click() {
    await act(async () => {
      document.querySelector("button")!.click();
    });
  }
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();
    for (const mock of Object.values(mocks))
      if (typeof mock === "function" && "mockReset" in mock) mock.mockReset();
    mocks.orgId = "office-a";
    mocks.flush.mockResolvedValue(undefined);
    mocks.getDraft.mockResolvedValue(draft);
    mocks.getBlob.mockResolvedValue(new Blob(["pdf"]));
    mocks.getDefault.mockResolvedValue(null);
    mocks.legacy.mockResolvedValue("https://storage/legacy");
    mocks.render.mockResolvedValue({
      id: "render-1",
      status: "READY",
      pdf_url: "https://storage/render",
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await show();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    URL.createObjectURL = originalURL.create;
    URL.revokeObjectURL = originalURL.revoke;
    vi.unstubAllGlobals();
  });
  it("uses legacy export only when there is no default", async () => {
    await click();
    expect(mocks.flush).toHaveBeenCalledBefore(mocks.getDraft);
    expect(mocks.legacy).toHaveBeenCalledOnce();
    expect(mocks.render).not.toHaveBeenCalled();
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "legacy",
    );
  });
  it("renders with the selected template and keeps its key on retry", async () => {
    mocks.getDefault
      .mockResolvedValueOnce({ template_id: "t1", version_id: "tv1" })
      .mockResolvedValueOnce({ template_id: "t2", version_id: "tv2" });
    mocks.render.mockRejectedValueOnce(new Error("converter unavailable"));
    await click();
    await click();
    expect(mocks.legacy).not.toHaveBeenCalled();
    expect(mocks.render).toHaveBeenCalledTimes(2);
    expect(mocks.render.mock.calls[0][3]).toBe(mocks.render.mock.calls[1][3]);
    expect(mocks.render.mock.calls[1][2]).toBe("tv1");
  });
  it("retries the pinned render when the default is removed", async () => {
    mocks.getDefault
      .mockResolvedValueOnce({ template_id: "t1", version_id: "tv1" })
      .mockResolvedValueOnce(null);
    mocks.render.mockRejectedValueOnce(new Error("converter unavailable"));
    await click();
    await click();
    expect(mocks.render).toHaveBeenCalledTimes(2);
    expect(mocks.render.mock.calls[1][2]).toBe("tv1");
    expect(mocks.render.mock.calls[1][3]).toBe(mocks.render.mock.calls[0][3]);
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("keeps a PDF generated after flush while invalidating a later edit", async () => {
    const acknowledged = {
      ...draft,
      contentHtml: "<p>Saved</p>",
      contentRevision: "r2",
    } as Draft;
    const saved = { ...acknowledged, updatedAt: "2026-01-02" } as Draft;
    const flushing = deferred<void>();
    const rendering = deferred<{
      id: string;
      status: string;
      pdf_url: string;
    }>();
    mocks.flush.mockReturnValueOnce(flushing.promise);
    mocks.getDraft.mockResolvedValue(saved);
    mocks.getDefault.mockResolvedValue({
      template_id: "t1",
      version_id: "tv1",
    });
    mocks.render.mockReturnValue(rendering.promise);
    await click();
    await act(async () => {
      client.setQueryData(["pecas-v2", "detail", "piece-1"], acknowledged);
    });
    await show(acknowledged);
    await act(async () => flushing.resolve());
    await act(async () =>
      rendering.resolve({
        id: "render-saved",
        status: "READY",
        pdf_url: "https://storage/saved",
      }),
    );
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "render-saved",
    );
    expect(document.querySelector("[data-testid=open]")?.textContent).toBe(
      "true",
    );
    await show({ ...acknowledged, contentHtml: "<p>Later edit</p>" });
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "empty",
    );
    expect(document.querySelector("[data-testid=open]")?.textContent).toBe(
      "false",
    );
  });
  it("discards a late render after an edit during conversion", async () => {
    const rendering = deferred<{
      id: string;
      status: string;
      pdf_url: string;
    }>();
    mocks.getDefault.mockResolvedValue({
      template_id: "t1",
      version_id: "tv1",
    });
    mocks.render.mockReturnValue(rendering.promise);
    await click();
    await show({ ...draft, contentHtml: "<p>Edited during render</p>" });
    await act(async () =>
      rendering.resolve({
        id: "late-render",
        status: "READY",
        pdf_url: "https://storage/late",
      }),
    );
    expect(mocks.getBlob).not.toHaveBeenCalled();
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "empty",
    );
  });
  it("never falls back after a render authorization error", async () => {
    mocks.getDefault.mockResolvedValue({
      template_id: "t1",
      version_id: "tv1",
    });
    mocks.render.mockRejectedValue(new Error("quality approval required"));
    await click();
    expect(mocks.legacy).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalled();
  });
  it("shows the render diagnostic and never falls back", async () => {
    mocks.getDefault.mockResolvedValue({
      template_id: "t1",
      version_id: "tv1",
    });
    mocks.render.mockResolvedValue({
      id: "render-1",
      status: "FAILED",
      diagnostic: "Modelo inválido",
    });
    await click();
    expect(mocks.toast).toHaveBeenCalledWith("Modelo inválido");
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("switches only for the directed legacy conflict", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.legacy.mockRejectedValue(
      new ApiError("CONFLICT", "use render", 409, {
        next_method: "POST",
        next_path: "/v1/pecas/piece-1/renders",
      }),
    );
    mocks.getDefault
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ template_id: "t1", version_id: "tv1" });
    await click();
    expect(mocks.render).toHaveBeenCalledOnce();
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "render-1",
    );
  });
  it("keeps a generic legacy conflict as an error", async () => {
    const { ApiError } = await import("@/lib/api/errors");
    mocks.legacy.mockRejectedValue(
      new ApiError("CONFLICT", "piece changed", 409, { reason: "stale" }),
    );
    await click();
    expect(mocks.render).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("piece changed");
  });
  it("invalidates the artifact when content or office changes", async () => {
    await click();
    expect(
      client.getQueryData(["pecas-v2", "pdf-artifact", "office-a", "piece-1"]),
    ).toBeDefined();
    await show({ ...draft, contentHtml: "<p>Changed</p>" });
    expect(
      client.getQueryData(["pecas-v2", "pdf-artifact", "office-a", "piece-1"]),
    ).toBeUndefined();
    await click();
    mocks.orgId = "office-b";
    await show();
    expect(
      client.getQueryData(["pecas-v2", "pdf-artifact", "office-a", "piece-1"]),
    ).toBeUndefined();
    expect(document.querySelector("[data-testid=result]")?.textContent).toBe(
      "empty",
    );
  });
  it("ignores a late draft response after the office changes", async () => {
    const pending = deferred<Draft>();
    mocks.getDraft.mockReturnValueOnce(pending.promise);
    await click();
    mocks.orgId = "office-b";
    await show();
    await act(async () => pending.resolve(draft));
    expect(mocks.getDefault).not.toHaveBeenCalled();
    expect(mocks.getBlob).not.toHaveBeenCalled();
    expect(
      client.getQueryData(["pecas-v2", "pdf-artifact", "office-a", "piece-1"]),
    ).toBeUndefined();
  });
  it("starts a new render intent after the draft version changes", async () => {
    mocks.getDefault.mockResolvedValue({
      template_id: "t1",
      version_id: "tv1",
    });
    await click();
    const firstKey = mocks.render.mock.calls[0][3];
    const updated = {
      ...draft,
      currentVersionId: "v2",
      updatedAt: "2026-01-02",
    } as Draft;
    mocks.getDraft.mockResolvedValue(updated);
    await show(updated);
    await click();
    expect(mocks.render.mock.calls[1][3]).not.toBe(firstKey);
    expect(mocks.render.mock.calls[1][2]).toBe("tv1");
  });
  it("stops when saving fails", async () => {
    mocks.flush.mockRejectedValue(new Error("save failed"));
    await click();
    expect(mocks.getDraft).not.toHaveBeenCalled();
    expect(mocks.legacy).not.toHaveBeenCalled();
  });
  it("uses the signed PDF and refreshes its source URL once", async () => {
    const signed = {
      ...draft,
      status: "SIGNED",
      signedPDFURL: "https://storage/old",
    } as Draft;
    mocks.getDraft.mockResolvedValueOnce(signed).mockResolvedValueOnce({
      ...signed,
      signedPDFURL: "https://storage/new",
    });
    mocks.getBlob
      .mockRejectedValueOnce(new Error("expired"))
      .mockResolvedValueOnce(new Blob(["signed"]));
    await show(signed);
    await click();
    expect(mocks.getBlob.mock.calls.map((call) => call[0])).toEqual([
      "https://storage/old",
      "https://storage/new",
    ]);
    expect(mocks.getDefault).not.toHaveBeenCalled();
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
