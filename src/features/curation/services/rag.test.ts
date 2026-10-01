import { expect, it, vi } from "vitest";

import type { ApiFetcher } from "@/lib/api/use-api";

import { buildRAGIndex, ragIndexSchema, searchRAG } from "./rag";

const id = "11111111-1111-4111-8111-111111111111",
  release = "22222222-2222-4222-8222-222222222222",
  digest = "a".repeat(64);
const contract = {
  corpus: "intimation-examples-v1",
  endpoint: "https://ai.mongodb.com/v1/embeddings",
  model: "voyage-4",
  dimension: 1024,
  normalization: "identity-utf8-v1",
  chunking: "utf8-4096-v1",
  query_aggregation: "mean-normalized-v1",
};
const index = {
  id,
  release_id: release,
  manifest_digest: digest,
  contract,
  state: "ready",
  embedding_state: "ready",
  chunk_count: 2,
  http_calls_reserved: 1,
  total_tokens: null,
  eligible: true,
  replayed: false,
};
it("rejects an incompatible vector space and inconsistent ready state", () => {
  expect(ragIndexSchema.parse(index).total_tokens).toBeNull();
  expect(
    ragIndexSchema.safeParse({
      ...index,
      contract: { ...contract, model: "voyage-4-lite" },
    }).success,
  ).toBe(false);
  expect(
    ragIndexSchema.safeParse({ ...index, embedding_state: "uncertain" })
      .success,
  ).toBe(false);
});
it("checks index command identity", async () => {
  const api = vi
    .fn()
    .mockResolvedValue({ data: index }) as unknown as ApiFetcher;
  await expect(
    buildRAGIndex(api, {
      release,
      body: {
        expected_manifest_digest: digest,
        confirmed: true,
        max_input_bytes: 131072,
      },
    }),
  ).resolves.toMatchObject({ id });
  await expect(
    buildRAGIndex(api, {
      release: id,
      body: {
        expected_manifest_digest: digest,
        confirmed: true,
        max_input_bytes: 131072,
      },
    }),
  ).rejects.toThrow();
});
it("rejects a result for a different task without retrying", async () => {
  const api = vi.fn().mockResolvedValue({
    data: {
      id,
      index_id: id,
      release_id: release,
      request_id: id,
      task_id: release,
      snapshot_digest: digest,
      state: "empty",
      model: "voyage-4",
      matches: [],
      http_calls_reserved: 0,
      total_tokens: null,
      replayed: false,
    },
  });
  await expect(
    searchRAG(api as unknown as ApiFetcher, {
      index: id,
      release,
      body: {
        request_id: id,
        task_id: id,
        expected_snapshot_digest: digest,
        confirmed: true,
        max_input_bytes: 131072,
        top_k: 3,
      },
    }),
  ).rejects.toThrow();
  expect(api).toHaveBeenCalledTimes(1);
});
