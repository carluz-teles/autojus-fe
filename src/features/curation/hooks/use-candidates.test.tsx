// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { candidateFixture } from "../__tests__/candidate-fixture";
import { useCandidateDetail, useCandidateSelection } from "./use-candidates";

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
  current: ReturnType<typeof useCandidateSelection>,
  detail: ReturnType<typeof useCandidateDetail>;
let f = candidateFixture(),
  lose = false,
  created = false,
  withdrawn = false,
  revoked = false;
function Harness() {
  const state = useCandidateSelection(f.comparisonID);
  useEffect(() => {
    current = state;
  });
  return <p>{state.message}</p>;
}
function DetailHarness() {
  const state = useCandidateDetail(f.candidateID);
  useEffect(() => {
    detail = state;
  });
  return null;
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 25));
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
  return mocks.api.mock.calls.filter(
    ([p, o]) => p.endsWith("/candidates") && o?.method === "POST",
  );
}
async function issue() {
  await act(async () =>
    current.comparison.actions.confirm(true, current.comparison.context),
  );
  await act(async () => current.comparison.issue());
  await flush();
  await flush();
}
async function prepare() {
  await issue();
  await act(async () => current.change(() => structuredClone(f.form)));
  await act(async () => current.review());
  await act(async () => current.confirm(true));
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f = candidateFixture();
  lose = false;
  created = false;
  withdrawn = false;
  revoked = false;
  mocks.capabilities = ["curation.publish", "curation.predict"];
  mocks.api.mockImplementation(async (path: string, options) => {
    if (revoked) throw new ApiError("FORBIDDEN", "Acesso revogado", 403);
    if (path.endsWith("/issue") && options?.method === "POST")
      return { data: { ...f.delivery, request_id: options.body.request_id } };
    if (path.endsWith("/candidates") && options?.method === "POST") {
      created = true;
      if (lose) {
        lose = false;
        throw new ApiError("NETWORK", "Resposta perdida", 0);
      }
      return { data: { ...f.candidate, request_id: options.body.request_id } };
    }
    if (path.endsWith(`/type-comparisons/${f.comparisonID}`))
      return {
        data: {
          ...f.metadata,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      };
    if (path.endsWith("/type-candidates"))
      return {
        data: created ? [f.summary] : [],
        page: { limit: 20, next_cursor: null },
      };
    if (path.endsWith(`/type-candidates/${f.candidateID}`))
      return {
        data: {
          ...f.candidate,
          eligible: !withdrawn,
          blockers: withdrawn ? ["plan_ineligible"] : [],
        },
      };
    throw new Error(`Unexpected read: ${path}`);
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

it("does not issue or freeze automatically and deduplicates a confirmed command", async () => {
  expect(
    mocks.api.mock.calls.filter(([, o]) => o?.method === "POST"),
  ).toHaveLength(0);
  expect(current.ready).toBe(false);
  await issue();
  await act(async () => current.change(() => structuredClone(f.form)));
  await act(async () => current.freeze());
  expect(posts()).toHaveLength(0);
  await act(async () => current.review());
  await act(async () => current.freeze());
  expect(posts()).toHaveLength(0);
  await act(async () => current.confirm(true));
  await act(async () => Promise.all([current.freeze(), current.freeze()]));
  await flush();
  await flush();
  expect(posts()).toHaveLength(1);
  expect(posts()[0][1].body.policy).toEqual(f.policy);
  expect(current.receipt?.document.id).toBe(f.candidateID);
  expect(current.checked).toBe(false);
});
it("invalidates confirmation when criteria or justification change and preserves explicit zero", async () => {
  await prepare();
  expect(current.checked).toBe(true);
  await act(async () =>
    current.change((v) => ({ ...v, reason: "Outra justificativa" })),
  );
  expect(current.checked).toBe(false);
  await act(async () => current.freeze());
  expect(posts()).toHaveLength(0);
  await act(async () =>
    current.change((v) => ({
      ...v,
      overall: { ...v.overall, max_critical_bps: "" },
    })),
  );
  await act(async () => current.review());
  expect(current.reviewedBody).toBeNull();
  expect(current.errors["overall.max_critical_bps"]).toBeTruthy();
});
it("recovers the original body after response loss even when history discovers the candidate", async () => {
  await prepare();
  lose = true;
  await act(async () => current.freeze());
  await flush();
  expect(current.write.uncertain).toBe(true);
  const body = structuredClone(posts()[0][1].body);
  await act(async () => current.refresh());
  await flush();
  expect(current.items).toHaveLength(1);
  await act(async () => {
    current.change((v) => ({
      ...v,
      reason: "Should not replace pending body",
    }));
    return current.freeze();
  });
  expect(current.form.reason).toBe(f.form.reason);
  expect(posts()).toHaveLength(1);
  await act(async () => current.recover());
  await flush();
  await flush();
  expect(posts()).toHaveLength(2);
  expect(posts()[1][1].body).toEqual(body);
  expect(current.receipt).toBeDefined();
});
it("blocks freeze after withdrawal and does not reuse confirmation after access refresh", async () => {
  await prepare();
  await act(async () => current.refresh());
  await flush();
  expect(current.checked).toBe(false);
  await act(async () => current.review());
  await act(async () => current.confirm(true));
  withdrawn = true;
  await act(async () => current.refresh());
  await flush();
  expect(current.ready).toBe(false);
  expect(current.delivery).toBeUndefined();
  await act(async () => current.freeze());
  expect(posts()).toHaveLength(0);
});
it("reads frozen history after reload without POST and removes it on authorization failure", async () => {
  await render(true);
  expect(detail.fresh).toBe(true);
  expect(posts()).toHaveLength(0);
  await act(async () => root.render(null));
  await render(true);
  expect(posts()).toHaveLength(0);
  revoked = true;
  await act(async () => detail.refresh());
  await flush();
  expect(detail.fresh).toBe(false);
  mocks.capabilities = ["curation.publish"];
  await render(true);
  const count = mocks.api.mock.calls.length;
  await act(async () => detail.refresh());
  expect(mocks.api).toHaveBeenCalledTimes(count);
});
it("cannot freeze from a training comparison or without both capabilities", async () => {
  f.metadata.split = "train" as typeof f.metadata.split;
  f.delivery.document.comparison.split = "train";
  await act(async () => current.refresh());
  await issue();
  await act(async () => current.change(() => structuredClone(f.form)));
  expect(current.ready).toBe(false);
  await act(async () => current.freeze());
  expect(posts()).toHaveLength(0);
  mocks.capabilities = [];
  await render();
  const count = mocks.api.mock.calls.length;
  await act(async () =>
    Promise.all([current.refresh(), current.freeze(), current.recover()]),
  );
  expect(mocks.api).toHaveBeenCalledTimes(count);
});
