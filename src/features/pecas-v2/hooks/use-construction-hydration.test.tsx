// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssessmentStateAPI } from "../lib/api-types";
import { useConstruction } from "./use-construction";
import { draftKeys } from "./use-draft";

const mocks = vi.hoisted(() => ({
  draftLoaded: false,
  fetch: vi.fn(),
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));
vi.mock("@/lib/telemetry/use-ai-experience", () => ({
  useAIExperience: vi.fn(),
}));
vi.mock("./use-draft", async (original) => ({
  ...(await original()),
  useDraft: () => ({
    data: mocks.draftLoaded
      ? {
          intimation: { id: "int-1", teor: "Teor persistido" },
          sagaState: "CREATED",
          contentHtml: "",
          instructions: "Instrução persistida",
          currentVersionId: null,
        }
      : undefined,
    isLoading: !mocks.draftLoaded,
    isError: false,
    dataUpdatedAt: 1,
  }),
}));
vi.mock("./use-theses", () => ({
  thesesKey: (id: string) => ["theses", id],
  useThesesController: () => ({
    theses: [{ id: "tese-1" }],
    selectedIds: ["tese-1"],
    isLoading: false,
    isError: false,
    isRegenerating: false,
    isTogglingId: null,
    regenerate: vi.fn(),
    regenerateAsync: vi.fn(),
  }),
  useGenerateDraft: () => ({
    isPending: false,
    mutate: mocks.mutate,
    mutateAsync: mocks.mutateAsync,
    error: null,
  }),
}));
vi.mock("./use-theses-stream", () => ({
  useThesesStream: () => ({ status: "idle", theses: [], count: 0 }),
}));

function assessment(status: string): AssessmentStateAPI {
  return {
    scope_type: "draft",
    scope_id: "draft-1",
    assessment: null,
    request: {
      id: "request-1",
      status,
      input_fingerprint: "fingerprint",
      requested_at: "2026-09-25T00:00:00Z",
      finished_at: null,
      error: status === "failed" ? { code: "failed", message: "Falhou" } : null,
    },
    needs_refresh: false,
    input: null,
  };
}

let latest: ReturnType<typeof useConstruction>;
function Probe() {
  const state = useConstruction("draft-1");
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("useConstruction assessment hydration with production cache defaults", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    sessionStorage.clear();
    mocks.draftLoaded = false;
    mocks.fetch.mockReset();
    mocks.mutate.mockReset();
    mocks.mutateAsync.mockReset().mockResolvedValue({ updated_at: "now" });
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    client.setQueryData(draftKeys.assessment("draft-1"), assessment("running"));
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

  it("reads again when enabled, blocks paid auto work, then offers one explicit failed-request retry", async () => {
    let settle!: (value: { data: AssessmentStateAPI }) => void;
    mocks.fetch.mockImplementation(
      () => new Promise((resolve) => (settle = resolve)),
    );
    const mount = () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      );
    await act(async () => mount());
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.mutate).not.toHaveBeenCalled();

    mocks.draftLoaded = true;
    await act(async () => mount());
    expect(mocks.fetch).toHaveBeenCalledWith("/v1/pecas/draft-1/assessment");
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(latest.autoFailed).toBe(false);

    await act(async () => settle({ data: assessment("failed") }));
    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
    expect(latest.autoFailed).toBe(true);
    expect(mocks.mutate).not.toHaveBeenCalled();
    await act(async () => {
      void latest.retryAuto();
      void latest.retryAuto();
    });
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({
      thesisIds: ["tese-1"],
      instructions: "Instrução persistida",
    });
  });
});
