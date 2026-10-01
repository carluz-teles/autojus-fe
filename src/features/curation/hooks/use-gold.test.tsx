// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { preview } from "../__tests__/gold-fixture";
import {
  type GoldPreview,
  goldPreviewReference,
} from "../services/annotation-gold";
import { useGoldForm } from "./use-gold";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  capabilities: ["curation.publish"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useGoldForm>,
  input: GoldPreview;
function Harness() {
  const state = useGoldForm(input, false);
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
  mocks.capabilities = ["curation.publish"];
  input = structuredClone(preview);
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
      purposes: ["evaluation"],
      legal_valid_from: "2026-09-01",
      legal_valid_until: "",
      reason: "Motivo explícito",
      confirmed: true,
      preview_reference: goldPreviewReference(input),
    }),
  );
}
it("requires the publisher capability and explicit fields", async () => {
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
it("recovers the exact frozen request after response loss and deduplicates clicks", async () => {
  await fill();
  mocks.api.mockRejectedValueOnce(new ApiError("NETWORK", "Response lost", 0));
  await act(async () => {
    await Promise.all([current.submit(), current.submit()]);
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(current.write.uncertain).toBe(true);
  const body = structuredClone(mocks.api.mock.calls[0][1].body);
  await act(async () =>
    current.form.setValue("reason", "Edited after timeout"),
  );
  input = { ...input, eligible: false, blockers: ["source_withdrawn"] };
  await render();
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  mocks.api.mockResolvedValueOnce({
    data: {
      id: "gold",
      decision_id: body.decision_id,
      previous_revision_id: null,
      revision: 1,
      eligible: false,
    },
  });
  await act(async () => {
    await current.recover();
  });
  await render();
  expect(mocks.api.mock.calls[1][1].body).toEqual(body);
  expect(current.locked).toBe(true);
  expect(current.write.mutation.data?.eligible).toBe(false);
});
it("keeps the form but requires reconfirmation when the preview changes", async () => {
  await fill();
  input = { ...input, revision: 1, previous_revision_id: "previous" };
  await render();
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).not.toHaveBeenCalled();
  expect(current.form.getValues("reason")).toBe("Motivo explícito");
  expect(current.message).toContain("confirme novamente");
});
it("preserves inputs on conflict and never retries automatically", async () => {
  await fill();
  mocks.api.mockRejectedValueOnce(
    new ApiError("CONFLICT", "New revision", 409),
  );
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(current.write.uncertain).toBe(false);
  expect(current.locked).toBe(false);
  expect(current.form.getValues("reason")).toBe("Motivo explícito");
});
