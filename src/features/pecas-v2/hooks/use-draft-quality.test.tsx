// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Draft } from "../types";
import { draftKeys, useDraft } from "./use-draft";

const mocks = vi.hoisted(() => ({ getDraft: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => vi.fn() }));
vi.mock("../services/pecas-v2.service", async (original) => ({
  ...(await original()),
  getDraft: mocks.getDraft,
}));

function version(
  id: string,
  reasonCode: string,
  updatedAt: string,
  sagaState = "DRAFTED",
): Draft {
  return {
    id: "draft-1",
    status: "DRAFT",
    sagaState,
    currentVersionId: id,
    qualityAuthorization: { allowed: reasonCode === "allowed", reasonCode },
    updatedAt,
  } as Draft;
}

function Probe() {
  useDraft("draft-1");
  return null;
}

describe("draft quality follow-up polling", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  const now = new Date("2026-09-25T04:00:00Z");
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    mocks.getDraft.mockReset();
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
    vi.useRealTimers();
  });
  async function mount() {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  }
  async function tick(ms: number) {
    await act(async () => vi.advanceTimersByTimeAsync(ms));
  }

  it("follows first DRAFTED through not_reviewed/blocked to final version without seeing EXTRACTING, then stops", async () => {
    mocks.getDraft
      .mockResolvedValueOnce(version("v1", "not_reviewed", now.toISOString()))
      .mockResolvedValueOnce(version("v1", "blocked", now.toISOString()))
      .mockResolvedValue(
        version(
          "v2",
          "escalated",
          new Date(now.getTime() + 2000).toISOString(),
        ),
      );
    await mount();
    expect(mocks.getDraft).toHaveBeenCalledTimes(1);
    await tick(1000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
    await tick(1000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(3);
    await tick(5000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(3);
  });

  it("does not poll an old unresolved version or keep polling past its fixed 300s window", async () => {
    mocks.getDraft.mockResolvedValue(
      version(
        "v1",
        "checking",
        new Date(now.getTime() - 301_000).toISOString(),
      ),
    );
    await mount();
    await tick(5000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(1);
  });

  it("does not renew the same version's deadline on checking-to-blocked changes", async () => {
    const start = new Date(now.getTime() - 299_000).toISOString();
    mocks.getDraft
      .mockResolvedValueOnce(version("v1", "checking", start))
      .mockResolvedValue(version("v1", "blocked", now.toISOString()));
    await mount();
    await tick(1000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
    await tick(5000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
  });

  it("keeps EXTRACTING polling and stops for held, finalized or unmounted drafts", async () => {
    mocks.getDraft
      .mockResolvedValueOnce(
        version("v1", "checking", now.toISOString(), "EXTRACTING"),
      )
      .mockResolvedValue(version("v1", "held", now.toISOString()));
    await mount();
    await tick(1000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
    await tick(5000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
    await act(async () => root.unmount());
    root = createRoot(host);
    await tick(5000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(2);
  });

  it("follows a visible quality retry from interim DRAFTED through EXTRACTING to final DRAFTED", async () => {
    mocks.getDraft
      .mockResolvedValueOnce(version("v1", "checking", now.toISOString()))
      .mockResolvedValueOnce(version("v1", "blocked", now.toISOString()))
      .mockResolvedValueOnce(
        version("v1", "checking", now.toISOString(), "EXTRACTING"),
      )
      .mockResolvedValue(
        version("v2", "allowed", new Date(now.getTime() + 3000).toISOString()),
      );
    await mount();
    await tick(3000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(4);
    await tick(3000);
    expect(mocks.getDraft).toHaveBeenCalledTimes(4);
  });

  it("keeps a newer accepted version when an older GET resolves afterward", async () => {
    let settle!: (value: Draft) => void;
    mocks.getDraft.mockImplementation(
      () => new Promise((resolve) => (settle = resolve)),
    );
    await mount();
    const final = version(
      "v2",
      "escalated",
      new Date(now.getTime() + 10_000).toISOString(),
    );
    final.contentRevision = "r2";
    final.contentHtml = "<p>Final</p>";
    client.setQueryData(draftKeys.detail("draft-1"), final);
    const interim = version("v1", "blocked", now.toISOString());
    interim.contentRevision = "r1";
    interim.contentHtml = "<p>Interim</p>";
    await act(async () => settle(interim));
    expect(
      client.getQueryData<Draft>(draftKeys.detail("draft-1")),
    ).toMatchObject({
      currentVersionId: "v2",
      contentRevision: "r2",
      contentHtml: "<p>Final</p>",
    });
  });

  it("keeps a local save acknowledgement when an older same-version GET resolves afterward", async () => {
    let settle!: (value: Draft) => void;
    mocks.getDraft.mockImplementation(
      () => new Promise((resolve) => (settle = resolve)),
    );
    await mount();
    const accepted = version("v1", "escalated", now.toISOString());
    accepted.contentRevision = "rA";
    accepted.contentHtml = "<p>Edited</p>";
    client.setQueryData(draftKeys.detail("draft-1"), accepted);
    const old = version("v1", "escalated", now.toISOString());
    old.contentRevision = "r1";
    old.contentHtml = "<p>Before edit</p>";
    await act(async () => settle(old));
    expect(
      client.getQueryData<Draft>(draftKeys.detail("draft-1")),
    ).toMatchObject({
      contentRevision: "rA",
      contentHtml: "<p>Edited</p>",
    });
  });
});
