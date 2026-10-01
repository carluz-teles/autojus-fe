// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  beginOrganizationTransition,
  verifyOrganizationTransition,
} from "@/lib/auth/organization-transition";

import { AiFeedback } from "./ai-feedback";

const mock = vi.hoisted(() => ({
  api: vi.fn(),
  auth: {
    isLoaded: true,
    isSignedIn: true,
    userId: "person-a",
    orgId: "org-a",
    sessionId: "session-a",
  },
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mock.api }));
vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mock.auth,
  useClerk: () => ({ openSignIn: vi.fn() }),
}));
const resultA = "018f0bf8-6e67-7000-8000-000000000001",
  resultB = "018f0bf8-6e67-7000-8000-000000000002";
let root: Root, host: HTMLDivElement, client: QueryClient, visible: boolean;
let observers: {
  callback: IntersectionObserverCallback;
  target: Element | null;
  disconnected: boolean;
}[];
const exposures = () =>
  mock.api.mock.calls.filter(([path]) => path.endsWith("/exposures"));
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
async function render(result = resultA) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <AiFeedback resultId={result} />
      </QueryClientProvider>,
    ),
  );
  await advance(20);
}
function intersect(ratio: number) {
  const observer = observers.findLast((o) => !o.disconnected);
  if (!observer?.target) throw new Error("CTA observer missing");
  observer.callback(
    [
      {
        target: observer.target,
        isIntersecting: ratio > 0,
        intersectionRatio: ratio,
      } as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver,
  );
}
function visibility(shown: boolean) {
  visible = shown;
  document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  visible = true;
  observers = [];
  mock.api.mockReset();
  mock.auth.userId = "person-a";
  verifyOrganizationTransition(beginOrganizationTransition(), "org-a");
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() =>
    visible ? "visible" : "hidden",
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      record: {
        callback: IntersectionObserverCallback;
        target: Element | null;
        disconnected: boolean;
      };
      constructor(callback: IntersectionObserverCallback) {
        this.record = { callback, target: null, disconnected: false };
        observers.push(this.record);
      }
      observe(target: Element) {
        this.record.target = target;
      }
      disconnect() {
        this.record.disconnected = true;
      }
    },
  );
  mock.api.mockImplementation(async (path: string) =>
    path.endsWith("/exposures")
      ? undefined
      : {
          data: {
            result_id: path.split("/")[3],
            dimension: "usefulness",
            revision: 0,
            status: "absent",
            helpful: null,
            updated_at: null,
          },
        },
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("counts only a visible available CTA after a continuous second, once per day", async () => {
  expect(exposures()).toHaveLength(0);
  expect(observers.findLast((o) => o.target)?.target?.textContent).toContain(
    "Sim",
  );
  intersect(0.4);
  await advance(1500);
  expect(exposures()).toHaveLength(0);
  intersect(0.6);
  await advance(600);
  intersect(0);
  await advance(800);
  expect(exposures()).toHaveLength(0);
  intersect(0.6);
  await advance(999);
  expect(exposures()).toHaveLength(0);
  await advance(1);
  expect(exposures()).toHaveLength(1);
  expect(exposures()[0][1]).toMatchObject({ method: "POST", body: {} });
  intersect(0);
  intersect(1);
  await advance(3000);
  expect(exposures()).toHaveLength(1);
  expect(host.textContent).not.toContain("Obrigado");
});

it("resets dwell time when the document is hidden and cancels the old result", async () => {
  intersect(1);
  await advance(500);
  visibility(false);
  await advance(2000);
  expect(exposures()).toHaveLength(0);
  visibility(true);
  await advance(500);
  await render(resultB);
  await advance(1000);
  expect(exposures()).toHaveLength(0);
  intersect(1);
  await advance(1000);
  expect(exposures()).toHaveLength(1);
  expect(exposures()[0][0]).toContain(resultB);
});

it("does not retry failed telemetry or block voting, and aborts I/O on identity change", async () => {
  mock.api.mockImplementation(async (path: string) => {
    if (path.endsWith("/exposures")) throw new Error("offline");
    return {
      data: {
        result_id: path.split("/")[3],
        dimension: "usefulness",
        revision: 0,
        status: "absent",
        helpful: null,
        updated_at: null,
      },
    };
  });
  intersect(1);
  await advance(1000);
  await advance(10000);
  expect(exposures()).toHaveLength(1);
  expect(
    [...host.querySelectorAll("button")].find((b) => b.textContent === "Sim")
      ?.disabled,
  ).toBe(false);
  const signal = exposures()[0][1].signal as AbortSignal;
  mock.auth.userId = "person-b";
  await render();
  expect(signal.aborted).toBe(true);
  intersect(1);
  await advance(1000);
  expect(exposures()).toHaveLength(2);
});

it("records a new observed day for a CTA left open across UTC midnight", async () => {
  vi.setSystemTime(new Date("2026-10-01T23:59:58Z"));
  intersect(1);
  await advance(1000);
  expect(exposures()).toHaveLength(1);
  await advance(2000);
  expect(exposures()).toHaveLength(2);
});

it("records nothing without IntersectionObserver", async () => {
  vi.stubGlobal("IntersectionObserver", undefined);
  await render(resultB);
  await advance(5000);
  expect(exposures()).toHaveLength(0);
});

it("does not attach visibility tracking while feedback is unavailable", async () => {
  mock.api.mockRejectedValue(new Error("read unavailable"));
  await render(resultB);
  await advance(5000);
  expect(exposures()).toHaveLength(0);
  expect(observers.filter((observer) => !observer.disconnected)).toHaveLength(
    0,
  );
});
