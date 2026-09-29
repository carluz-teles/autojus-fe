// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

import { POLL_TIMEOUT_MS, useCheckoutReturn } from "./use-checkout-return";

let latest: ReturnType<typeof useCheckoutReturn>;
function Probe() {
  const state = useCheckoutReturn();
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("useCheckoutReturn", () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.useFakeTimers();
    mocks.search = "";
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  async function render() {
    await act(async () => root.render(<Probe />));
  }

  it("never confirms without ?checkout=success in the URL — the query string only TRIGGERS the poll, is not trusted as the result", async () => {
    mocks.search = "";
    await render();

    expect(latest.confirming).toBe(false);
    expect(latest.refetchInterval).toBe(false);
  });

  it("confirms and polls when the redirect carries ?checkout=success", async () => {
    mocks.search = "checkout=success";
    await render();

    expect(latest.confirming).toBe(true);
    expect(latest.refetchInterval).toBe(2000);
  });

  it("markResolved stops the poll immediately — the caller invokes it the moment the subscription arrives", async () => {
    mocks.search = "checkout=success";
    await render();
    expect(latest.confirming).toBe(true);

    await act(async () => latest.markResolved());

    expect(latest.confirming).toBe(false);
    expect(latest.refetchInterval).toBe(false);
    expect(latest.timedOut).toBe(false);
  });

  it("times out after ~15s if the webhook never lands — a wait message, never an error", async () => {
    mocks.search = "checkout=success";
    await render();

    await act(async () => {
      vi.advanceTimersByTime(POLL_TIMEOUT_MS);
    });

    expect(latest.confirming).toBe(false);
    expect(latest.timedOut).toBe(true);
    expect(latest.refetchInterval).toBe(false);
  });
});
