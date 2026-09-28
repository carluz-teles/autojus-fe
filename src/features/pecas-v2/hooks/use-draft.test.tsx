// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AssessmentStateAPI } from "../lib/api-types";
import { useAssessment } from "./use-draft";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));

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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
}

let latest: ReturnType<typeof useAssessment>;
function Probe() {
  const result = useAssessment("draft-1", true);
  useEffect(() => {
    latest = result;
  });
  return null;
}

describe("useAssessment persisted hydration", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
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

  it("does not treat cached success as hydrated until a fresh remount read settles", async () => {
    mocks.fetch.mockResolvedValueOnce({ data: assessment("running") });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
    expect(mocks.fetch).toHaveBeenCalledWith("/v1/pecas/draft-1/assessment");
    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
    expect(latest.isSuccess).toBe(true);
    expect(latest.isFetching).toBe(false);

    await act(async () => root.unmount());
    root = createRoot(host);
    const second = deferred<{ data: AssessmentStateAPI }>();
    mocks.fetch.mockReturnValueOnce(second.promise);
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(latest.isFetching).toBe(true);
    await act(async () => second.resolve({ data: assessment("failed") }));
    await act(async () => {
      await new Promise((done) => setTimeout(done, 10));
    });
    expect(latest.isFetching).toBe(false);
    expect(latest.data?.request?.status).toBe("failed");
  });
});
