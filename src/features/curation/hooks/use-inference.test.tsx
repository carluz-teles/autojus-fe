// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import type { PreparedTask } from "../services/annotation-preparation";
import { type InferenceJob, inferenceKeys } from "../services/inference";
import { useInference } from "./use-inference";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.predict"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
const task: PreparedTask = {
  id: "11111111-1111-4111-8111-111111111111",
  source_link_id: "source",
  case_version_id: "version",
  snapshot_digest: "a".repeat(64),
  source_digest: "s",
  sanitized_digest: "s",
  split: "train",
  mode: "assisted",
};
const route = {
  enabled: true,
  route: {
    task: "curation.annotate_intimation",
    model: "synthetic/model",
    prompt_version: "intimation-inference-v1",
    max_tokens: 4000,
    endpoint: "http://127.0.0.1:18081/api/v1",
  },
  digest: "b".repeat(64),
  max_http_calls: 1,
} as const;
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useInference>,
  jobs: InferenceJob[],
  blind: boolean,
  lose: boolean;
function Harness() {
  const state = useInference(
    { ...task, mode: blind ? "blind" : "assisted" },
    "c".repeat(64),
    true,
  );
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
}
function receipt(
  request: string,
  state: InferenceJob["state"] = "queued",
): InferenceJob {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    request_id: request,
    task_id: task.id,
    attempt: 1,
    state,
    failure_code: state === "uncertain" ? "worker_expired" : null,
    prediction_id: null,
    route_digest: route.digest,
    route: route.route,
    requested_at: "2026-10-01T00:00:00Z",
    reserved_at: null,
    finished_at: null,
    http_calls_reserved: null,
    cost_usd: null,
    late_result: false,
    idempotent_replay: false,
  };
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.capabilities = ["curation.predict"];
  jobs = [];
  blind = false;
  lose = false;
  mocks.api.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      const result = receipt(options.body.request_id);
      jobs = [result];
      if (lose) {
        lose = false;
        throw new ApiError("NETWORK", "Resposta perdida", 0);
      }
      return { data: result };
    }
    return { data: path.endsWith("/inference-route") ? route : jobs };
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
async function open() {
  await act(async () => current.openPanel());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}
async function confirm() {
  await act(async () =>
    current.form.setValue("confirmed_context", current.context),
  );
}
function posts() {
  return mocks.api.mock.calls.filter((c) => c[1]?.method === "POST");
}
it("does not load on mount, requires explicit confirmation and deduplicates submission", async () => {
  expect(mocks.api).not.toHaveBeenCalled();
  await open();
  await act(async () => current.submit());
  expect(posts()).toHaveLength(0);
  await confirm();
  await act(async () => {
    await Promise.all([current.submit(), current.submit()]);
  });
  expect(posts()).toHaveLength(1);
  expect(posts()[0][1].body).toMatchObject({
    confirmed: true,
    expected_route_digest: route.digest,
    expected_previous_job_id: null,
  });
  expect(current.latest?.state).toBe("queued");
  await act(async () => current.submit());
  expect(posts()).toHaveLength(1);
});
it("recovers the exact command after a lost response even when history refresh finds the job", async () => {
  await open();
  await confirm();
  lose = true;
  await act(async () => current.submit());
  const sent = structuredClone(posts()[0][1].body);
  expect(current.write.uncertain).toBe(true);
  await act(async () => current.refresh());
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  expect(current.latest?.id).toBe(jobs[0].id);
  expect(current.write.uncertain).toBe(true);
  await act(async () => current.submit());
  expect(posts()).toHaveLength(1);
  await act(async () => current.recover());
  expect(posts()).toHaveLength(2);
  expect(posts()[1][1].body).toEqual(sent);
  expect(current.write.uncertain).toBe(false);
});
it("requires acknowledgement of an uncertain execution before creating another", async () => {
  jobs = [receipt("33333333-3333-4333-8333-333333333333", "uncertain")];
  await open();
  await confirm();
  await act(async () => current.submit());
  expect(posts()).toHaveLength(0);
  await act(async () =>
    current.form.setValue("uncertain_context", current.context),
  );
  await act(async () => current.submit());
  expect(posts()[0][1].body).toMatchObject({
    expected_previous_job_id: "22222222-2222-4222-8222-222222222222",
    acknowledged_uncertain_job_id: "22222222-2222-4222-8222-222222222222",
  });
});
it("invalidates consent when the model changes and never fetches for blind or unauthorized users", async () => {
  await open();
  await confirm();
  await act(async () => {
    client.setQueryData(inferenceKeys.route, {
      ...route,
      digest: "d".repeat(64),
      route: { ...route.route, model: "synthetic/new" },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(current.confirmed).toBe(false);
  await act(async () => current.submit());
  expect(posts()).toHaveLength(0);
  mocks.capabilities = [];
  await render();
  const count = mocks.api.mock.calls.length;
  await act(async () => current.refresh());
  expect(mocks.api).toHaveBeenCalledTimes(count);
  mocks.capabilities = ["curation.predict"];
  blind = true;
  await render();
  await act(async () => current.refresh());
  expect(mocks.api).toHaveBeenCalledTimes(count);
});
