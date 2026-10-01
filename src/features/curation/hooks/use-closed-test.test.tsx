// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { closedTestFixture } from "../__tests__/closed-test-fixture";
import type {
  ClosedReservation,
  ClosedRun,
} from "../services/closed-test-schemas";
import { useClosedTest } from "./use-closed-test";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.publish", "curation.predict"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useClosedTest>;
let f = closedTestFixture(),
  reservation: ClosedReservation | null,
  run: ClosedRun | null,
  lose: boolean,
  issued: boolean,
  revoked: boolean;
function Harness() {
  const s = useClosedTest(f.candidateID);
  useEffect(() => {
    current = s;
  });
  return <p>{s.actions.message}</p>;
}
async function flush() {
  for (let i = 0; i < 4; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 15));
    });
}
async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
  await flush();
}
function posts() {
  return mocks.api.mock.calls.filter((c) => c[1]?.method === "POST");
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f = closedTestFixture();
  f.candidate.closed_test_available = true;
  reservation = null;
  run = null;
  lose = false;
  issued = false;
  revoked = false;
  mocks.capabilities = ["curation.publish", "curation.predict"];
  mocks.api.mockImplementation(async (path, options) => {
    if (revoked) throw new ApiError("FORBIDDEN", "Revogado", 403);
    const post = options?.method === "POST";
    if (path.endsWith("/closed-test-preview"))
      return { data: { ...f.preview, selection: options.body } };
    if (path.endsWith("/closed-test-reservation")) {
      if (post)
        reservation = {
          ...f.reservation,
          request_id: options.body.request_id,
          preview: { ...f.preview, selection: options.body.selection },
        };
      if (post && lose) {
        lose = false;
        throw new ApiError("NETWORK", "Perdida", 0);
      }
      return { data: reservation };
    }
    if (path.endsWith("/run")) {
      if (post)
        run = {
          ...f.run,
          state: "queued",
          finished_at: null,
          work_counts: { queued: 2 },
          request_id: options.body.request_id,
        };
      if (post && lose) {
        lose = false;
        throw new ApiError("NETWORK", "Perdida", 0);
      }
      return { data: run };
    }
    if (path.endsWith("/report")) {
      if (post) {
        issued = true;
        if (lose) {
          lose = false;
          throw new ApiError("NETWORK", "Perdida", 0);
        }
        return { data: { ...f.delivery, request_id: options.body.request_id } };
      }
      if (!issued) throw new ApiError("ENTITY_NOT_FOUND", "Ausente", 404);
      return { data: f.metadata };
    }
    if (path.includes("dataset-releases/")) return { data: f.release };
    return { data: f.candidate };
  });
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
  vi.unstubAllGlobals();
});
async function prepare() {
  await act(async () => {
    current.editor.form.setValue("reason", "Teste sintético");
  });
  await act(async () => current.editor.prepare());
  await flush();
}
it("honors disabled execution and never reads scores or metadata while a run is active", async () => {
  reservation = { ...f.reservation, execution_available: false };
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.actions.canExecute).toBe(false);
  await act(async () => current.actions.confirmRun(true));
  await act(async () => current.actions.execute());
  expect(posts()).toHaveLength(0);
  run = {
    ...f.run,
    state: "running",
    finished_at: null,
    work_counts: { running: 1, queued: 1 },
  };
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.actions.canIssue).toBe(false);
  expect(
    mocks.api.mock.calls.filter(([path]) => path.endsWith("/report")),
  ).toHaveLength(0);
});
it("requires preview plus reservation confirmation and does not execute on mount or reserve", async () => {
  expect(posts()).toHaveLength(0);
  await prepare();
  expect(current.editor.current).toBeDefined();
  await act(async () => current.editor.reserve());
  expect(posts()).toHaveLength(1);
  await act(async () => current.editor.confirm(true));
  await act(async () =>
    Promise.all([current.editor.reserve(), current.editor.reserve()]),
  );
  await flush();
  expect(posts()).toHaveLength(2);
  expect(current.queries.reservation.data).not.toBeNull();
  await act(async () => current.actions.execute());
  expect(posts()).toHaveLength(2);
});
it("invalidates confirmation after input changes and refreshed authority", async () => {
  await prepare();
  await act(async () => current.editor.confirm(true));
  await act(async () => {
    current.editor.form.setValue("reason", "Outra razão");
    current.editor.change();
  });
  expect(current.editor.confirmed).toBe(false);
  expect(current.editor.current).toBeUndefined();
  await prepare();
  await act(async () => current.editor.confirm(true));
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.editor.current).toBeUndefined();
  await act(async () => current.editor.reserve());
  expect(posts()).toHaveLength(2);
});
it("recovers the exact uncertain reservation even when a read already discovers it", async () => {
  await prepare();
  await act(async () => current.editor.confirm(true));
  lose = true;
  await act(async () => current.editor.reserve());
  await flush();
  const original = structuredClone(posts()[1][1].body);
  expect(current.actions.write.uncertain).toBe(true);
  await act(async () => current.queries.refresh());
  await flush();
  await act(async () => current.actions.confirmRun(true));
  await act(async () => current.actions.execute());
  expect(posts()).toHaveLength(2);
  await act(async () => current.actions.recover());
  await flush();
  expect(posts()[2][1].body).toEqual(original);
  expect(current.actions.write.uncertain).toBe(false);
});
it("executes once with separate consent, recovering the same command without retry", async () => {
  reservation = f.reservation;
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.actions.canExecute).toBe(true);
  await act(async () => current.actions.execute());
  expect(posts()).toHaveLength(0);
  await act(async () => current.actions.confirmRun(true));
  lose = true;
  await act(async () =>
    Promise.all([current.actions.execute(), current.actions.execute()]),
  );
  await flush();
  expect(posts()).toHaveLength(1);
  const body = structuredClone(posts()[0][1].body);
  await act(async () => current.queries.refresh());
  await flush();
  await act(async () => current.actions.recover());
  await flush();
  expect(posts()).toHaveLength(2);
  expect(posts()[1][1].body).toEqual(body);
});
it("opens historical evidence despite dispatch ineligibility and hides it on revocation", async () => {
  reservation = {
    ...f.reservation,
    eligible: false,
    blockers: ["exposed"],
    execution_available: false,
  };
  run = { ...f.run, eligible: false, blockers: ["exposed"] };
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.actions.canIssue).toBe(true);
  await act(async () => current.actions.issue());
  expect(posts()).toHaveLength(0);
  await act(async () => current.actions.confirmReport(true));
  lose = true;
  await act(async () => current.actions.issue());
  await flush();
  const body = structuredClone(posts()[0][1].body);
  expect(current.actions.delivery).toBeUndefined();
  await act(async () => current.actions.recover());
  await flush();
  expect(posts()[1][1].body).toEqual(body);
  expect(current.actions.delivery?.report.conclusion).toBe("passed");
  revoked = true;
  await act(async () => current.queries.refresh());
  await flush();
  expect(current.actions.delivery).toBeUndefined();
  expect(current.actions.canIssue).toBe(false);
  mocks.capabilities = [];
  await render();
  await act(async () => current.actions.recover());
  expect(posts()).toHaveLength(2);
});
