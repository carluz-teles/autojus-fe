// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ChangeEvent, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { evaluationFixture } from "../__tests__/evaluation-fixture";
import { releaseFixture } from "../__tests__/release-fixture";
import { useEvaluationPreparation } from "./use-evaluations";

const mocks = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({
    capabilities: ["curation.publish", "curation.predict"],
  }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useEvaluationPreparation>;
let f = evaluationFixture(),
  release = releaseFixture(),
  lose: boolean;
function Harness() {
  const state = useEvaluationPreparation(release, false);
  useEffect(() => {
    current = state;
  });
  return <p>{state.message}</p>;
}
async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
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
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  f = evaluationFixture();
  release = {
    ...releaseFixture(),
    manifest_digest: f.preview.selection.expected_manifest_digest,
  };
  lose = false;
  mocks.api.mockImplementation(async (path, options) => {
    if (path.endsWith("-preview")) return { data: f.preview };
    if (lose) {
      lose = false;
      throw new ApiError("NETWORK", "Resposta perdida", 0);
    }
    return { data: { ...f.plan, request_id: options.body.request_id } };
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
  await act(async () =>
    current.form.setValue("limits", f.preview.selection.limits),
  );
  await act(async () => current.prepare());
  await flush();
}
async function confirm() {
  await act(async () =>
    current.confirm({
      target: { checked: true },
    } as ChangeEvent<HTMLInputElement>),
  );
}
it("requires explicit budgets and confirmation, and clears confirmation for new preview", async () => {
  expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => current.prepare());
  expect(mocks.api).not.toHaveBeenCalled();
  await prepare();
  await act(async () => current.freeze());
  expect(mocks.api).toHaveBeenCalledTimes(1);
  await confirm();
  expect(current.confirmed).toBe(true);
  await act(async () => current.prepare());
  expect(current.confirmed).toBe(false);
  await confirm();
  await act(async () => Promise.all([current.freeze(), current.freeze()]));
  expect(mocks.api).toHaveBeenCalledTimes(3);
  expect(current.write.mutation.data?.id).toBe(f.ids.plan);
  expect(mocks.api.mock.calls.some(([path]) => path.endsWith("/run"))).toBe(
    false,
  );
});
it("invalidates preview on budget or manifest changes, refusing a stale freeze", async () => {
  await prepare();
  await confirm();
  await act(async () => current.form.setValue("limits.max_cases", 2));
  expect(current.current).toBeUndefined();
  await act(async () => current.freeze());
  expect(mocks.api).toHaveBeenCalledTimes(1);
  await act(async () => current.form.setValue("limits.max_cases", 1));
  release = { ...release, manifest_digest: "f".repeat(64) };
  await render();
  expect(current.current).toBeUndefined();
  await act(async () => current.freeze());
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
it("recovers the same freeze request, even if the dataset was withdrawn meanwhile", async () => {
  await prepare();
  await confirm();
  lose = true;
  await act(async () => current.freeze());
  await flush();
  const sent = structuredClone(mocks.api.mock.calls[1][1].body);
  expect(current.write.uncertain).toBe(true);
  release = { ...release, withdrawn: true, eligible: false };
  await render();
  await act(async () => current.freeze());
  expect(mocks.api).toHaveBeenCalledTimes(2);
  await act(async () => current.recover());
  expect(mocks.api.mock.calls[2][1].body).toEqual(sent);
});

it("requires a new preview when the evaluation pipeline changes", async () => {
  await prepare();
  await confirm();
  await act(async () => current.form.setValue("pipeline", "deterministic"));
  expect(current.current).toBeUndefined();
  expect(current.confirmed).toBe(false);
  await act(async () => current.freeze());
  expect(mocks.api).toHaveBeenCalledTimes(1);
  await act(async () => current.prepare());
  expect(mocks.api.mock.calls[1][1].body.pipeline).toBe("deterministic");
  expect(current.current).toBeUndefined(); // The mock returned the old canonical preview.
});
