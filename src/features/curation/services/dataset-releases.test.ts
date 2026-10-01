import { expect, it, vi } from "vitest";

import {
  downloadDataset,
  releaseBody,
  type ReleaseFormValues,
  type ReleasePreview,
} from "./dataset-releases";
const preview = {
  digest: "a".repeat(64),
  manifest: { batch_id: "batch", purpose: "evaluation", included_count: 1 },
} as ReleasePreview;
it("freezes the exact preview without a caller-selected subset", () => {
  const values: ReleaseFormValues = {
    name: "Avaliação setembro",
    purpose: "evaluation",
    confirmed: true,
    preview_digest: preview.digest,
  };
  expect(releaseBody(values, preview, "batch", "request")).toEqual({
    request_id: "request",
    batch_id: "batch",
    purpose: "evaluation",
    expected_preview_digest: preview.digest,
    name: values.name,
  });
  for (const v of [
    { confirmed: false },
    { preview_digest: "stale" },
    { purpose: "training" },
  ] as Partial<ReleaseFormValues>[])
    expect(() =>
      releaseBody({ ...values, ...v }, preview, "batch", "request"),
    ).toThrow();
  expect(() =>
    releaseBody(
      values,
      { ...preview, manifest: { ...preview.manifest, included_count: 0 } },
      "batch",
      "request",
    ),
  ).toThrow();
});
it("verifies the downloaded bytes and identity before handing out a file", async () => {
  const blob = new Blob(["synthetic zip bytes"]),
    bytes = await blob.arrayBuffer();
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  const id = "11111111-1111-4111-8111-111111111111",
    req = "22222222-2222-4222-8222-222222222222";
  const command = {
    release_id: id,
    request_id: req,
    expected_manifest_digest: "a".repeat(64),
    publication: {
      manifest_digest: "b".repeat(64),
      canonical_digest: "c".repeat(64),
      canonical_bytes: 5,
    },
  };
  const headers = {
    "x-dataset-release-id": id,
    "x-dataset-request-id": req,
    "x-dataset-delivery-id": "33333333-3333-4333-8333-333333333333",
    "x-dataset-source-manifest-sha256": command.expected_manifest_digest,
    "x-dataset-manifest-sha256": command.publication.manifest_digest,
    "x-dataset-canonical-sha256": command.publication.canonical_digest,
    "x-dataset-canonical-bytes": "5",
    "x-dataset-bundle-sha256": digest,
    "x-idempotent-replay": "false",
  };
  const api = vi.fn().mockResolvedValue({ blob, headers });
  const result = await downloadDataset(api, command);
  expect(result.blob).toBe(blob);
  expect(result.filename).toBe(`dataset-${id}.zip`);
  api.mockResolvedValue({
    blob,
    headers: { ...headers, "x-dataset-release-id": "different" },
  });
  await expect(downloadDataset(api, command)).rejects.toThrow();
  api.mockResolvedValue({ blob: new Blob(["corrupt"]), headers });
  await expect(downloadDataset(api, command)).rejects.toThrow();
  const abort = new AbortController();
  abort.abort();
  api.mockResolvedValue({ blob, headers });
  await expect(downloadDataset(api, command, abort.signal)).rejects.toThrow();
});
