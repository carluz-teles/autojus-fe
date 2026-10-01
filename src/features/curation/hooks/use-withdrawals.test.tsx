// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import type { WithdrawalImpact } from "../services/withdrawals";
import { useScopedWithdrawalForm } from "./use-withdrawals";
const preview: WithdrawalImpact = {
  scope: "source",
  target: "source-1",
  digest: "a".repeat(64),
  affected_sources: 1,
  gold_revisions: 1,
  releases: 1,
  publications: 0,
  already_withdrawn: false,
  group_withdrawn: false,
  policy_active: null,
  withdrawal: null,
};
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
  current: ReturnType<typeof useScopedWithdrawalForm>,
  input: WithdrawalImpact;
function Harness() {
  const state = useScopedWithdrawalForm(input, false);
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
      reason: "Motivo explícito",
      confirmed: true,
      preview_digest: input.digest,
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
  input = { ...input, already_withdrawn: true, digest: "b".repeat(64) };
  await render();
  await act(async () => {
    await current.submit();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  mocks.api.mockResolvedValueOnce({
    data: {
      id: "withdrawal",
      source_link_id: input.target,
      privacy_policy_revision: null,
      idempotent_replay: true,
    },
  });
  await act(async () => {
    await current.recover();
  });
  await render();
  expect(mocks.api.mock.calls[1][1].body).toEqual(body);
  expect(current.locked).toBe(true);
  expect(current.write.mutation.data?.idempotent_replay).toBe(true);
});
it("keeps the form but requires reconfirmation when the preview changes", async () => {
  await fill();
  input = { ...input, digest: "b".repeat(64), releases: 2 };
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

it("does not recover a pending request after publisher access is revoked", async () => {
  await fill();
  mocks.api.mockRejectedValueOnce(new ApiError("NETWORK", "Response lost", 0));
  await act(async () => {
    await current.submit();
  });
  mocks.capabilities = [];
  await render();
  await act(async () => {
    await current.recover();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
});
