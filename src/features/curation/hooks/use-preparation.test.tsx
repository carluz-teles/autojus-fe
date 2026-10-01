// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { useProtocolForm } from "./use-preparation";

const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.manage"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useProtocolForm>;
function Harness() {
  const state = useProtocolForm(null, [{ key: "ciencia", label: "Ciência" }]);
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
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.capabilities = ["curation.manage"];
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
async function fill() {
  await act(async () =>
    current.form.reset({
      key: "synthetic-protocol",
      origin: "synthetic",
      matter_key: "civil",
      act_types: ["ciencia"],
      rubric: "Orientação sintética",
      rules: [],
      ordinary_reviews: 1,
      review_reference: "synthetic:review",
      reviewed_at: "2026-09-29T10:00:00Z",
      reason: "Fixture",
      confirmed: true,
    }),
  );
}
it("refuses empty protocols and blocks writes without management capability", async () => {
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).not.toHaveBeenCalled();
  await fill();
  mocks.capabilities = [];
  await render();
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).not.toHaveBeenCalled();
});
it("requires a new confirmation when adding rules and leaves their quantity invalid until entered", async () => {
  await fill();
  await act(async () => current.addRule());
  expect(current.form.getValues("confirmed")).toBe(false);
  expect(current.form.getValues("rules.0.quantity")).toBe(0);
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).not.toHaveBeenCalled();
});
it("deduplicates double clicks and recovers the exact body despite local edits", async () => {
  await fill();
  mocks.api.mockRejectedValueOnce(new ApiError("NETWORK", "Response lost", 0));
  await act(async () => {
    await Promise.all([current.submit(), current.submit()]);
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(current.write.uncertain).toBe(true);
  const command = structuredClone(mocks.api.mock.calls[0][1].body);
  await act(async () => current.form.setValue("rubric", "Edits after timeout"));
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  mocks.api.mockResolvedValueOnce({ data: { id: "protocol", revision: 1 } });
  await act(async () => {
    await current.recover();
  });
  expect(mocks.api.mock.calls[1][1].body).toEqual(command);
  expect(current.locked).toBe(true);
});
