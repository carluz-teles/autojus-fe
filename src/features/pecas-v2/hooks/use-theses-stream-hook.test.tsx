// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useThesesStream } from "./use-theses-stream";

const mocks = vi.hoisted(() => ({ getToken: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({ getToken: mocks.getToken }),
}));

class FakeEventSource {
  static latest: FakeEventSource;
  private listeners = new Map<string, (event: MessageEvent) => void>();
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor() {
    FakeEventSource.latest = this;
  }
  addEventListener(name: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(name, listener as (event: MessageEvent) => void);
  }
  emit(name: string, payload: unknown) {
    this.listeners.get(name)?.(
      new MessageEvent(name, { data: JSON.stringify(payload) }),
    );
  }
}

let latest: ReturnType<typeof useThesesStream>;
const onError = vi.fn();
const onDone = vi.fn();
function Probe() {
  const state = useThesesStream("pecas/draft-1", {
    enabled: true,
    onError,
    onDone,
  });
  useEffect(() => {
    latest = state;
  });
  return null;
}

describe("useThesesStream application and transport errors", () => {
  let root: Root;
  let host: HTMLDivElement;
  beforeEach(async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ token: "x" }) }),
    );
    mocks.getToken.mockReset().mockResolvedValue("jwt");
    onError.mockReset();
    onDone.mockReset();
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  });

  it("passes the coded validation error through without treating it as transport", async () => {
    await act(async () =>
      FakeEventSource.latest.emit("error", {
        message: "Uma sugestão citou trecho ausente das fontes consultadas.",
        code: "thesis_evidence_invalid",
      }),
    );
    expect(onError).toHaveBeenCalledExactlyOnceWith(
      false,
      "Uma sugestão citou trecho ausente das fontes consultadas.",
      "thesis_evidence_invalid",
    );
    expect(latest.status).toBe("error");
    expect(latest.errorCode).toBe("thesis_evidence_invalid");
    expect(latest.theses).toEqual([]);
    expect(FakeEventSource.latest.close).toHaveBeenCalledTimes(1);
    await act(async () => FakeEventSource.latest.onerror?.());
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("keeps transport errors uncoded for the existing fallback", async () => {
    await act(async () => FakeEventSource.latest.onerror?.());
    expect(onError).toHaveBeenCalledExactlyOnceWith(false);
    expect(latest.status).toBe("error");
  });

  it("accepts a valid done frame as the authoritative list", async () => {
    await act(async () =>
      FakeEventSource.latest.emit("done", {
        data: [
          {
            id: "real-1",
            label: "Fundamento válido",
            foundation: "Argumento",
            legal_ref: "",
            source_document_id: "",
            source_label: "",
            source_excerpt: "",
            anchors: [],
            segments: [],
            grounded: true,
            state: "off",
            position: 1,
            confidence: "alta",
          },
        ],
      }),
    );
    expect(latest.status).toBe("done");
    expect(latest.theses.map((t) => t.id)).toEqual(["real-1"]);
    expect(onDone).toHaveBeenCalledWith(latest.theses);
    expect(onError).not.toHaveBeenCalled();
  });
});
