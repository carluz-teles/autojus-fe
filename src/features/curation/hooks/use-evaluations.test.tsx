// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { evaluationFixture } from "../__tests__/evaluation-fixture";
import type { EvaluationRun } from "../services/evaluation-schemas";
import { useEvaluationDetail } from "./use-evaluations";

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
  current: ReturnType<typeof useEvaluationDetail>;
let f = evaluationFixture(),
  run: EvaluationRun | null,
  lose: boolean,
  issued: boolean,
  revoked: boolean;
function Harness() {
  const state = useEvaluationDetail(f.ids.plan);
  useEffect(() => {
    current = state;
  });
  return <p>{state.message}</p>;
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
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}
function posts() {
  return mocks.api.mock.calls.filter((c) => c[1]?.method === "POST");
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f = evaluationFixture();
  run = null;
  lose = false;
  issued = false;
  revoked = false;
  mocks.capabilities = ["curation.publish", "curation.predict"];
  mocks.api.mockImplementation(async (path, options) => {
    if (revoked) throw new ApiError("FORBIDDEN", "Acesso revogado", 403);
    if (path.endsWith("/report")) {
      if (options?.method === "POST") {
        issued = true;
        if (lose) {
          lose = false;
          throw new ApiError("NETWORK", "Resposta perdida", 0);
        }
        return { data: { ...f.delivery, request_id: options.body.request_id } };
      }
      if (!issued) throw new ApiError("ENTITY_NOT_FOUND", "Ausente", 404);
      return {
        data: {
          id: f.ids.report,
          run_id: f.ids.run,
          plan_id: f.ids.plan,
          definition_digest: f.plan.definition_digest,
          digest: f.delivery.digest,
          evaluator_version: "intimation-dimensions-v1",
          case_count: 1,
          generated_at: f.plan.frozen_at,
          eligible: true,
          blockers: [],
        },
      };
    }
    if (path.endsWith("/run")) {
      if (options?.method === "POST") {
        run = {
          ...f.run,
          state: "queued",
          finished_at: null,
          request_id: options.body.request_id,
        };
        if (lose) {
          lose = false;
          throw new ApiError("NETWORK", "Resposta perdida", 0);
        }
      }
      if (!run) throw new ApiError("ENTITY_NOT_FOUND", "Ausente", 404);
      return { data: run };
    }
    return { data: f.plan };
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
it("loads only metadata and requires a separate confirmation before one deduplicated execution", async () => {
  expect(posts()).toHaveLength(0);
  await act(async () => current.execute());
  expect(posts()).toHaveLength(0);
  await act(async () =>
    current.form.setValue("run_context", current.runContext),
  );
  await act(async () => Promise.all([current.execute(), current.execute()]));
  await flush();
  expect(posts()).toHaveLength(1);
  expect(posts()[0][1].body.confirmed).toBe(true);
  expect(current.run.data?.state).toBe("queued");
  await act(async () => current.execute());
  expect(posts()).toHaveLength(1);
});

it("does not enqueue a pipeline whose persistent executor is unavailable", async () => {
  f.plan.execution_available = false;
  await act(async () => current.refresh());
  await flush();
  expect(current.canExecute).toBe(false);
  await act(async () =>
    current.form.setValue("run_context", current.runContext),
  );
  await act(async () => current.execute());
  expect(posts()).toHaveLength(0);
});

it("does not request or issue a report when the run has no compatible scorer", async () => {
  run = { ...f.run, report_available: false };
  await act(async () => current.refresh());
  await flush();
  expect(current.canIssue).toBe(false);
  expect(
    mocks.api.mock.calls.filter(([path]) => path.endsWith("/report")),
  ).toHaveLength(0);
  await act(async () =>
    current.form.setValue("report_context", current.reportContext),
  );
  await act(async () => current.issue());
  expect(posts()).toHaveLength(0);
});
it("retains exact request after response loss and never creates a replacement on refresh", async () => {
  await act(async () =>
    current.form.setValue("run_context", current.runContext),
  );
  lose = true;
  await act(async () => current.execute());
  await flush();
  const body = structuredClone(posts()[0][1].body);
  expect(current.write.uncertain).toBe(true);
  await act(async () => current.refresh());
  await flush();
  await act(async () => current.execute());
  expect(posts()).toHaveLength(1);
  await act(async () => current.recover());
  await flush();
  expect(posts()).toHaveLength(2);
  expect(posts()[1][1].body).toEqual(body);
  expect(current.write.uncertain).toBe(false);
});
it("allows historic report with disabled inference, confirms exposure and hides it on access loss", async () => {
  f.plan.eligible = false;
  f.plan.blockers = ["inference_route_changed"];
  run = { ...f.run, eligible: false, blockers: ["inference_route_changed"] };
  await act(async () => current.refresh());
  await flush();
  await flush();
  expect(current.canIssue).toBe(true);
  expect(posts()).toHaveLength(0);
  await act(async () => current.issue());
  expect(posts()).toHaveLength(0);
  await act(async () =>
    current.form.setValue("report_context", current.reportContext),
  );
  await act(async () => current.issue());
  await flush();
  expect(posts()).toHaveLength(1);
  expect(posts()[0][1].body.confirmed_exposure).toBe(true);
  expect(current.delivery?.report.run_state).toBe("uncertain");
  revoked = true;
  await act(async () => current.refresh());
  await flush();
  expect(current.delivery).toBeUndefined();
  expect(current.canIssue).toBe(false);
});
it("does not fetch or send for an operator without both capabilities", async () => {
  mocks.capabilities = ["curation.publish"];
  await render();
  const count = mocks.api.mock.calls.length;
  await act(async () =>
    Promise.all([
      current.refresh(),
      current.execute(),
      current.issue(),
      current.recover(),
    ]),
  );
  expect(mocks.api).toHaveBeenCalledTimes(count);
  expect(current.allowed).toBe(false);
});
