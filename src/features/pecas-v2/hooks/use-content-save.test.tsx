// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Draft } from "../types";
import { useContentSave } from "./use-content-save";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.fetch }));

function draft(version: string, revision: string, html: string, second = 0) {
  return {
    id: "draft-1",
    status: "DRAFT",
    sagaState: "DRAFTED",
    currentVersionId: version,
    contentRevision: revision,
    contentHtml: html,
    updatedAt: `2026-09-25T04:00:${String(second).padStart(2, "0")}Z`,
  } as Draft;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

let latest: ReturnType<typeof useContentSave>;
function Probe({
  value,
  onHydrate,
}: {
  value: Draft;
  onHydrate: (html: string) => void;
}) {
  const state = useContentSave("draft-1", value, onHydrate);
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("useContentSave server body/revision reconciliation", () => {
  let client: QueryClient;
  let root: Root;
  let host: HTMLDivElement;
  let hydrate: ReturnType<typeof vi.fn>;
  const interim = draft("v1", "r1", "<p>Interim</p>");
  const final = draft("v2", "r2", "<p>Final completo</p>", 10);
  async function render(value: Draft) {
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe value={value} onHydrate={hydrate} />
        </QueryClientProvider>,
      ),
    );
  }
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    sessionStorage.clear();
    mocks.fetch.mockReset();
    hydrate = vi.fn();
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

  it("hydrates clean interim then final body with its revision, without autosave; first edit uses final revision", async () => {
    await render(interim);
    expect(hydrate).toHaveBeenLastCalledWith("<p>Interim</p>");
    expect(latest.queue.revision).toBe("r1");
    await render(final); // no EXTRACTING render required
    expect(hydrate).toHaveBeenLastCalledWith("<p>Final completo</p>");
    expect(latest.queue.revision).toBe("r2");
    expect(mocks.fetch).not.toHaveBeenCalled();
    mocks.fetch.mockResolvedValue({ data: { revision: "r3" } });
    await act(async () => {
      latest.change("<p>Final completo + edição</p>");
      await latest.flush();
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/v1/pecas/draft-1/content-html",
      expect.objectContaining({
        method: "PUT",
        body: {
          content_html: "<p>Final completo + edição</p>",
          revision: "r2",
        },
      }),
    );
  });

  it("keeps dirty and conflicting local HTML/revision and its recovery instead of adopting a final version", async () => {
    await render(interim);
    await act(async () => latest.change("<p>Local edit</p>"));
    await render(final);
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(latest.queue.revision).toBe("r1");
    expect(sessionStorage.getItem("peca-recovery:draft-1")).toBe(
      "<p>Local edit</p>",
    );
    mocks.fetch.mockRejectedValue(new Error("409 conflict"));
    await act(async () => {
      await expect(latest.flush()).rejects.toThrow("409 conflict");
    });
    await render(final);
    expect(latest.state).toBe("error");
    expect(latest.queue.revision).toBe("r1");
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("peca-recovery:draft-1")).toBe(
      "<p>Local edit</p>",
    );
  });

  it("preserves an in-flight local save and its base when the final server version arrives and the save conflicts", async () => {
    await render(interim);
    const pending = deferred<{ data: { revision: string } }>();
    mocks.fetch.mockReturnValue(pending.promise);
    let flushing!: Promise<void>;
    await act(async () => {
      latest.change("<p>Local in flight</p>");
      flushing = latest.flush();
    });
    await render(final);
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(latest.queue.revision).toBe("r1");
    const rejected = expect(flushing).rejects.toThrow("409 conflict");
    await act(async () => pending.reject(new Error("409 conflict")));
    await rejected;
    await render(final);
    expect(latest.queue.revision).toBe("r1");
    expect(latest.state).toBe("error");
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("peca-recovery:draft-1")).toBe(
      "<p>Local in flight</p>",
    );
  });

  it("does not replace newer typing when A acknowledges or a stale refetch arrives; B uses A revision", async () => {
    await render(interim);
    const a = deferred<{ data: { revision: string } }>();
    const b = deferred<{ data: { revision: string } }>();
    mocks.fetch.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    let flushing!: Promise<void>;
    await act(async () => {
      latest.change("<p>Edit A</p>");
      flushing = latest.flush();
    });
    await act(async () => latest.change("<p>Edit B</p>"));
    await act(async () => a.resolve({ data: { revision: "rA" } }));
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.fetch.mock.calls[1][1].body).toEqual({
      content_html: "<p>Edit B</p>",
      revision: "rA",
    });
    await render(interim); // old GET that finishes after A
    expect(hydrate).toHaveBeenCalledTimes(1);
    expect(latest.queue.revision).toBe("rA");
    await act(async () => b.resolve({ data: { revision: "rB" } }));
    await act(async () => flushing);
    await render(interim); // old GET that finishes after B
    expect(latest.queue.revision).toBe("rB");
    expect(hydrate).toHaveBeenCalledTimes(1);
  });
});
