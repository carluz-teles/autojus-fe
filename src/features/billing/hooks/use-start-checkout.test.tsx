// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));

import { useStartCheckout } from "./use-start-checkout";

let latest: ReturnType<typeof useStartCheckout>;
function Probe() {
  const state = useStartCheckout();
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("useStartCheckout", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.fetch.mockReset();
    client = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    client.clear();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  }

  // mutate() does not return a promise the test can await — it fires the
  // mutationFn and lets React Query settle state asynchronously. A macrotask
  // tick (not just a microtask) gives the mock's rejected/resolved promise
  // chain time to run and React time to commit the resulting state.
  async function flush() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("Fase 5: a 409 CONFLICT (tenant already subscribed) surfaces as isConflict, not as a generic error", async () => {
    mocks.fetch.mockRejectedValue(
      new ApiError("CONFLICT", "already subscribed", 409),
    );
    await render();

    await act(async () => latest.start("price_123"));
    await flush();

    expect(latest.isConflict).toBe(true);
    expect(latest.error).toBeNull();
  });

  it("any other failure stays a plain error, never mislabeled as a conflict", async () => {
    mocks.fetch.mockRejectedValue(new ApiError("INTERNAL", "boom", 500));
    await render();

    await act(async () => latest.start("price_123"));
    await flush();

    expect(latest.isConflict).toBe(false);
    expect(latest.error).not.toBeNull();
  });

  it("redirects to the returned checkout_url on success", async () => {
    const original = window.location;
    // jsdom's window.location is not directly assignable; redefine it for this
    // test only so `.href =` can be observed without navigating jsdom for real.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...original, href: "" },
    });

    mocks.fetch.mockResolvedValue({ checkout_url: "https://stripe/checkout" });
    await render();

    await act(async () => latest.start("price_123"));

    expect(window.location.href).toBe("https://stripe/checkout");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });
  });
});
