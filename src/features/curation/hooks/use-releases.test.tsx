// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import {
  publicationFixture,
  releaseFixture,
} from "../__tests__/release-fixture";
import {
  type PublicationJob,
  publicationPoll,
} from "../services/dataset-releases";
import { useReleaseActions } from "./use-releases";
const mocks = vi.hoisted(() => ({
  api: vi.fn(),
  transfer: vi.fn(),
  capabilities: ["curation.publish"],
}));
vi.mock("@/lib/api/use-api", () => ({ useApi: () => mocks.api }));
vi.mock("./_private/use-dataset-transfer", () => ({
  useDatasetTransfer: () => mocks.transfer,
}));
vi.mock("./use-backoffice-context", () => ({
  useBackofficeContext: () => ({ capabilities: mocks.capabilities }),
}));
let root: Root,
  host: HTMLDivElement,
  client: QueryClient,
  current: ReturnType<typeof useReleaseActions>,
  jobs: PublicationJob[];
let release = releaseFixture();
function Harness() {
  const state = useReleaseActions(release, jobs, false);
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
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.capabilities = ["curation.publish"];
  jobs = [];
  release = releaseFixture();
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
it("does not publish or download on mount and requires explicit confirmation", async () => {
  expect(mocks.api).not.toHaveBeenCalled();
  await act(async () => {
    await current.publish();
  });
  expect(mocks.api).not.toHaveBeenCalled();
  jobs = [publicationFixture()];
  await render();
  await act(async () => {
    await current.download();
  });
  expect(mocks.transfer).not.toHaveBeenCalled();
  mocks.capabilities = [];
  await render();
  await act(async () => current.form.setValue("download", true));
  await act(async () => {
    await current.download();
  });
  expect(mocks.transfer).not.toHaveBeenCalled();
});
it("serializes actions and recovers the same publication request", async () => {
  await act(async () => current.form.setValue("publish", true));
  mocks.api.mockRejectedValueOnce(new ApiError("NETWORK", "Lost", 0));
  await act(async () => {
    await Promise.all([current.publish(), current.publish()]);
  });
  await render();
  expect(mocks.api).toHaveBeenCalledTimes(1);
  expect(current.write.uncertain).toBe(true);
  const body = structuredClone(mocks.api.mock.calls[0][1].body);
  await act(async () => {
    current.form.setValue("withdraw", true);
    current.form.setValue("reason", "Explicit withdrawal");
    await current.withdraw();
  });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  mocks.api.mockResolvedValueOnce({
    data: {
      ...publicationFixture(),
      state: "queued",
      available: false,
      publication: null,
    },
  });
  await act(async () => {
    await current.recover();
  });
  await render();
  expect(mocks.api.mock.calls[1][1].body).toEqual(body);
  expect(current.write.mutation.data?.kind).toBe("publish");
});
it("downloads only an available publication and returns metadata without caching bytes", async () => {
  jobs = [publicationFixture()];
  await render();
  await act(async () => current.form.setValue("download", true));
  mocks.transfer.mockResolvedValue({
    delivery_id: "delivery",
    filename: "dataset.zip",
    digest: "digest",
    bytes: 8,
  });
  await act(async () => {
    await current.download();
  });
  await render();
  expect(mocks.transfer).toHaveBeenCalledTimes(1);
  expect(current.write.mutation.data).not.toHaveProperty("blob");
  expect(current.form.getValues("download")).toBe(false);
});
it("keeps a test-only release available for evaluation but refuses generic export", async () => {
  release = {
    ...release,
    manifest: {
      ...release.manifest,
      split_counts: { train: 0, validation: 0, test: 1 },
    },
  };
  await render();
  expect(current.canPublish).toBe(false);
  await act(async () => current.form.setValue("publish", true));
  await act(async () => current.publish());
  expect(mocks.api).not.toHaveBeenCalled();
  jobs = [publicationFixture()]; // Historical metadata cannot bypass the gate.
  await render();
  expect(current.canDownload).toBe(false);
  await act(async () => current.form.setValue("download", true));
  await act(async () => current.download());
  expect(mocks.transfer).not.toHaveBeenCalled();
});
it("stops polling on terminal states and on errors", () => {
  for (const state of ["published", "blocked", "failed"] as const)
    expect(
      publicationPoll([{ ...publicationFixture(), state }], "success"),
    ).toBe(false);
  expect(
    publicationPoll([{ ...publicationFixture(), state: "running" }], "success"),
  ).toBe(3000);
  expect(
    publicationPoll([{ ...publicationFixture(), state: "running" }], "error"),
  ).toBe(false);
});
