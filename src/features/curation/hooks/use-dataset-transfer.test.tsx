// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useDatasetTransfer } from "./_private/use-dataset-transfer";
const mocks = vi.hoisted(() => ({ download: vi.fn() }));
vi.mock("@/lib/api/use-api", () => ({ useApiBinary: () => vi.fn() }));
vi.mock("../services/dataset-releases", () => ({
  downloadDataset: mocks.download,
}));
let root: Root,
  host: HTMLDivElement,
  transfer: ReturnType<typeof useDatasetTransfer>;
function Probe() {
  const run = useDatasetTransfer();
  useEffect(() => {
    transfer = run;
  });
  return null;
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<Probe />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("cancels a pending transfer and never saves late bytes after unmount", async () => {
  let finish!: (value: unknown) => void;
  mocks.download.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const create = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
  const result = transfer({
    release_id: "release",
    request_id: "request",
    expected_manifest_digest: "digest",
    publication: {
      manifest_digest: "manifest",
      canonical_digest: "canonical",
      canonical_bytes: 1,
    },
  });
  const signal = mocks.download.mock.calls[0][2] as AbortSignal;
  await act(async () => root.render(null));
  expect(signal.aborted).toBe(true);
  finish({
    blob: new Blob(["private"]),
    filename: "private.zip",
    delivery_id: "delivery",
  });
  await expect(result).rejects.toMatchObject({ name: "AbortError" });
  expect(create).not.toHaveBeenCalled();
});
