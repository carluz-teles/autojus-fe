// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { comparisonFixture } from "../__tests__/comparison-fixture";
import { releaseFixture } from "../__tests__/release-fixture";
import { useComparisonDetail, useComparisonWorkspace } from "./use-comparisons";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.publish", "curation.predict"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root, host: HTMLDivElement, client: QueryClient;
let current: ReturnType<typeof useComparisonWorkspace>,
  detail: ReturnType<typeof useComparisonDetail>;
let f = comparisonFixture(),
  lose: boolean,
  created: boolean,
  revoked: boolean,
  withdrawn: boolean,
  missing: boolean;
function Harness() {
  const state = useComparisonWorkspace(f.ids.release);
  useEffect(() => {
    current = state;
  });
  return <p>{state.actions.message}</p>;
}
function DetailHarness() {
  const state = useComparisonDetail(f.comparisonID);
  useEffect(() => {
    detail = state;
  });
  return <p>{state.actions.message}</p>;
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30));
  });
}
async function render(isDetail = false) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        {isDetail ? <DetailHarness /> : <Harness />}
      </QueryClientProvider>,
    ),
  );
  await flush();
}
function posts() {
  return mocks.api.mock.calls.filter((c) => c[1]?.method === "POST");
}
async function chooseAll() {
  await act(async () => {
    for (const p of f.plans) current.toggle(p);
  });
  await flush();
  await flush();
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f = comparisonFixture();
  lose = false;
  created = false;
  revoked = false;
  withdrawn = false;
  missing = false;
  mocks.capabilities = ["curation.publish", "curation.predict"];
  mocks.api.mockImplementation(async (path: string, options) => {
    if (revoked) throw new ApiError("FORBIDDEN", "Acesso revogado", 403);
    if (options?.method === "POST") {
      created = true;
      if (lose) {
        lose = false;
        throw new ApiError("NETWORK", "Resposta perdida", 0);
      }
      return { data: { ...f.delivery, request_id: options.body.request_id } };
    }
    if (path.endsWith(`/dataset-releases/${f.ids.release}`))
      return {
        data: {
          ...releaseFixture(),
          id: f.ids.release,
          manifest_digest: f.preview.selection.expected_manifest_digest,
          eligible: !withdrawn,
          withdrawn,
        },
      };
    if (path.endsWith("/evaluation-plans"))
      return { data: f.plans, page: { next_cursor: null, limit: 20 } };
    if (path.endsWith("/type-comparisons")) {
      const {
        source_reports: _sources,
        eligible: _eligible,
        blockers: _blockers,
        ...summary
      } = f.metadata;
      return {
        data: created ? [summary] : [],
        page: { next_cursor: null, limit: 20 },
      };
    }
    if (path.endsWith(`/type-comparisons/${f.comparisonID}`))
      return {
        data: {
          ...f.metadata,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      };
    const source = f.sources.find(
      (s) => path.includes(s.plan_id) || path.includes(s.run_id),
    );
    if (!source) throw new Error(`Unexpected read: ${path}`);
    if (path.endsWith("/run"))
      return {
        data: {
          ...f.run,
          id: source.run_id,
          plan_id: source.plan_id,
          state: "completed",
        },
      };
    if (missing)
      throw new ApiError("ENTITY_NOT_FOUND", "Relatório ausente", 404);
    return {
      data: {
        id: source.report_id,
        run_id: source.run_id,
        plan_id: source.plan_id,
        definition_digest: f.plan.definition_digest,
        digest: "d".repeat(64),
        evaluator_version: "type-projection-v1",
        case_count: 1,
        generated_at: f.plan.frozen_at,
        eligible: !withdrawn,
        blockers: withdrawn ? ["plan_ineligible"] : [],
      },
    };
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

it("fetches source metadata only after selection and requires confirmation for one concurrent command", async () => {
  expect(posts()).toHaveLength(0);
  expect(mocks.api.mock.calls.some(([p]) => p.endsWith("/run"))).toBe(false);
  await chooseAll();
  expect(current.canCreate).toBe(true);
  await act(async () => current.create());
  expect(posts()).toHaveLength(0);
  await act(async () => current.actions.confirm(true, current.context));
  await act(async () => Promise.all([current.create(), current.create()]));
  await flush();
  await flush();
  expect(posts()).toHaveLength(1);
  expect(posts()[0][1].body.sources).toEqual(f.refs);
  expect(current.actions.delivery?.document.id).toBe(f.comparisonID);
});
it("clears confirmation on source order changes and refuses mixed splits", async () => {
  await chooseAll();
  await act(async () => current.actions.confirm(true, current.context));
  await act(async () => current.reference(f.plans[1].id));
  await flush();
  await act(async () => current.create());
  expect(posts()).toHaveLength(0);
  await act(async () => current.toggle(f.plans[2]));
  await act(async () => current.toggle({ ...f.plans[2], split: "train" }));
  await flush();
  expect(current.sameSplit).toBe(false);
  expect(current.canCreate).toBe(false);
});
it("keeps the exact request available after response loss and refresh", async () => {
  await chooseAll();
  await act(async () => current.actions.confirm(true, current.context));
  lose = true;
  await act(async () => current.create());
  await flush();
  expect(current.actions.write.uncertain).toBe(true);
  const command = structuredClone(posts()[0][1].body);
  await act(async () => current.refresh());
  await flush();
  await act(async () => {
    current.toggle(f.plans[0]);
    return current.create();
  });
  expect(current.selected).toHaveLength(3);
  expect(posts()).toHaveLength(1);
  await act(async () => current.actions.recover());
  await flush();
  await flush();
  expect(posts()).toHaveLength(2);
  expect(posts()[1][1].body).toEqual(command);
  expect(current.actions.delivery).toBeDefined();
});
it("does not generate missing reports as a side effect of selecting sources", async () => {
  missing = true;
  await chooseAll();
  expect(current.canCreate).toBe(false);
  expect(posts()).toHaveLength(0);
  expect(current.sources[0].data?.report).toBeNull();
});

it("limits rapid batched selection to three sources before fetching", async () => {
  await act(async () => {
    for (const plan of f.plans) current.toggle(plan);
    current.toggle({
      ...f.plans[0],
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
  });
  await flush();
  expect(current.selected).toHaveLength(3);
  expect(
    mocks.api.mock.calls.some(([path]) => path.includes("aaaaaaaa-aaaa")),
  ).toBe(false);
});
it("requires a new explicit issuance after navigation/reload and hides output on withdrawal", async () => {
  await render(true);
  expect(posts()).toHaveLength(0);
  expect(detail.actions.delivery).toBeUndefined();
  await act(async () => detail.actions.confirm(true, detail.context));
  await act(async () => detail.issue());
  await flush();
  expect(detail.actions.delivery).toBeDefined();
  await act(async () => root.render(null));
  await render(true);
  expect(posts()).toHaveLength(1);
  expect(detail.actions.delivery).toBeUndefined();
  await act(async () => detail.actions.confirm(true, detail.context));
  await act(async () => detail.issue());
  await flush();
  withdrawn = true;
  await act(async () => detail.actions.refresh());
  await flush();
  expect(detail.canIssue).toBe(false);
  expect(detail.actions.delivery).toBeUndefined();
});
it("stops reads and writes without both capabilities and hides receipts on access failure", async () => {
  await render(true);
  await act(async () => detail.actions.confirm(true, detail.context));
  await act(async () => detail.issue());
  await flush();
  expect(detail.actions.delivery).toBeDefined();
  revoked = true;
  await act(async () => detail.actions.refresh());
  await flush();
  expect(detail.actions.delivery).toBeUndefined();
  expect(detail.canIssue).toBe(false);
  mocks.capabilities = ["curation.publish"];
  await render(true);
  const count = mocks.api.mock.calls.length;
  await act(async () =>
    Promise.all([
      detail.issue(),
      detail.actions.refresh(),
      detail.actions.recover(),
    ]),
  );
  expect(mocks.api).toHaveBeenCalledTimes(count);
});
