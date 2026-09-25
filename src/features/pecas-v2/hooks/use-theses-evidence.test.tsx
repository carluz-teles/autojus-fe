// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import type { Thesis } from "../types";
import { thesesKey, useThesesController } from "./use-theses";

const mocks = vi.hoisted(() => ({
  getTheses: vi.fn(),
  generateTheses: vi.fn(),
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("@/lib/telemetry/use-ai-experience", () => ({
  useAIExperience: vi.fn(),
}));
vi.mock("../services/pecas-v2.service", async (original) => ({
  ...(await original()),
  getTheses: mocks.getTheses,
  generateTheses: mocks.generateTheses,
}));

let latest: ReturnType<typeof useThesesController>;
function Probe() {
  const state = useThesesController("draft-1");
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("synchronous thesis evidence error", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  const prior = [{ id: "prior-1", state: "included" }] as Thesis[];
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.getTheses.mockReset().mockResolvedValue(prior);
    mocks.generateTheses.mockReset();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(thesesKey("draft-1"), prior);
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    vi.unstubAllGlobals();
  });

  it("keeps authoritative cards and selection after coded 400, with explicit retry available", async () => {
    mocks.generateTheses
      .mockRejectedValueOnce(
        new ApiError("VALIDATION", "Invalid evidence", 400, {
          code: "thesis_evidence_invalid",
        }),
      )
      .mockResolvedValueOnce([{ id: "new-1", state: "off" }]);
    await act(async () => {
      await expect(latest.regenerateAsync()).rejects.toThrow(
        "Invalid evidence",
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(latest.errorCode).toBe("thesis_evidence_invalid");
    expect(latest.theses).toEqual(prior);
    expect(latest.selectedIds).toEqual(["prior-1"]);
    expect(mocks.generateTheses).toHaveBeenCalledTimes(1);

    await act(async () => {
      await latest.regenerateAsync();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.generateTheses).toHaveBeenCalledTimes(2);
    expect(latest.theses).toEqual([{ id: "new-1", state: "off" }]);
  });
});
