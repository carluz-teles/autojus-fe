import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import { intimationAnnotationSchema } from "./annotation-schema";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const ragContractSchema = z.strictObject({
  corpus: z.literal("intimation-examples-v1"),
  endpoint: z.enum([
    "https://ai.mongodb.com/v1/embeddings",
    "https://api.voyageai.com/v1/embeddings",
  ]),
  model: z.literal("voyage-4"),
  dimension: z.literal(1024),
  normalization: z.literal("identity-utf8-v1"),
  chunking: z.literal("utf8-4096-v1"),
  query_aggregation: z.literal("mean-normalized-v1"),
});
export const ragIndexSchema = z
  .strictObject({
    id: z.uuid(),
    release_id: z.uuid(),
    manifest_digest: digest,
    contract: ragContractSchema,
    state: z.enum(["building", "ready"]),
    embedding_state: z.enum(["dispatched", "ready", "uncertain"]),
    chunk_count: z.int().min(1).max(128),
    http_calls_reserved: z.literal(1),
    total_tokens: z.int().nonnegative().nullable(),
    eligible: z.boolean(),
    replayed: z.boolean(),
  })
  .refine(
    (v) => v.state !== "ready" || v.embedding_state === "ready",
    "Índice pronto sem embeddings confirmados.",
  );
const availabilitySchema = z
  .strictObject({
    enabled: z.boolean(),
    contract: ragContractSchema.nullable(),
    indexes: z.array(ragIndexSchema).max(32),
  })
  .refine(
    (v) => !v.enabled || v.contract !== null,
    "Configuração vetorial ausente.",
  );
// This is a presentation projection of the canonical record. Only these
// validated fields are rendered; the server retains the complete pinned gold.
const exampleSchema = z.object({
  id: z.uuid(),
  split: z.literal("train"),
  origin: z.enum(["real", "synthetic"]),
  gold_digest: digest,
  group_digest: digest,
  input: z.object({ facts: z.object({ text: z.string().max(131072) }) }),
  annotation: intimationAnnotationSchema,
});
const matchSchema = z
  .strictObject({
    gold_id: z.uuid(),
    ordinal: z.int().nonnegative(),
    score: z.number().finite(),
    text: z.string().min(1),
    start_byte: z.int().nonnegative(),
    end_byte: z.int().positive(),
    example: exampleSchema,
  })
  .refine((v) => {
    const bytes = new TextEncoder().encode(v.example.input.facts.text);
    return (
      v.gold_id === v.example.id &&
      v.end_byte > v.start_byte &&
      v.end_byte <= bytes.length &&
      new TextDecoder().decode(bytes.slice(v.start_byte, v.end_byte)) === v.text
    );
  }, "Trecho incompatível com o exemplo revisado.");
export const ragResultSchema = z
  .strictObject({
    id: z.uuid(),
    request_id: z.uuid(),
    task_id: z.uuid(),
    snapshot_digest: digest,
    index_id: z.uuid(),
    release_id: z.uuid(),
    state: z.enum(["dispatched", "uncertain", "empty", "ready"]),
    model: z.literal("voyage-4"),
    matches: z.array(matchSchema).max(5),
    http_calls_reserved: z.int().min(0).max(1),
    total_tokens: z.int().nonnegative().nullable(),
    replayed: z.boolean(),
  })
  .refine(
    (v) =>
      (v.state === "ready") === v.matches.length > 0 &&
      new Set(v.matches.map((m) => m.example.group_digest)).size ===
        v.matches.length,
    "Resultado vetorial incompatível.",
  );
export type RAGIndex = z.infer<typeof ragIndexSchema>;
export type RAGResult = z.infer<typeof ragResultSchema>;
export type RAGAvailability = z.infer<typeof availabilitySchema>;
export type RAGBuildCommand = {
  release: string;
  body: {
    expected_manifest_digest: string;
    confirmed: true;
    max_input_bytes: number;
  };
};
export type RAGSearchCommand = {
  index: string;
  release: string;
  body: {
    request_id: string;
    task_id: string;
    expected_snapshot_digest: string;
    confirmed: true;
    max_input_bytes: number;
    top_k: number;
  };
};
export const ragKeys = {
  all: ["curation", "rag"] as const,
  release: (id: string) => ["curation", "rag", "release", id] as const,
};
export const ragConfirmationSchema = z.strictObject({ confirmed: z.boolean() });
const root = "/v1/curation";
export async function getRAGAvailability(
  api: ApiFetcher,
  release: string,
  signal?: AbortSignal,
) {
  const r = await api<{ data: unknown }>(
    `${root}/dataset-releases/${encodeURIComponent(release)}/rag-index`,
    { signal },
  );
  const v = availabilitySchema.parse(r.data);
  if (
    v.indexes.some((i) => i.release_id !== release) ||
    new Set(v.indexes.map((i) => i.id)).size !== v.indexes.length
  )
    throw new Error("Índices de outro dataset.");
  return v;
}
export async function buildRAGIndex(api: ApiFetcher, command: RAGBuildCommand) {
  const r = await api<{ data: unknown }>(
    `${root}/dataset-releases/${encodeURIComponent(command.release)}/rag-index`,
    { method: "POST", body: command.body },
  );
  const v = ragIndexSchema.parse(r.data);
  if (
    v.release_id !== command.release ||
    v.manifest_digest !== command.body.expected_manifest_digest
  )
    throw new Error("Recibo de indexação incompatível. Recupere o envio.");
  return v;
}
export async function searchRAG(api: ApiFetcher, command: RAGSearchCommand) {
  const r = await api<{ data: unknown }>(
    `${root}/rag-indexes/${encodeURIComponent(command.index)}/queries`,
    { method: "POST", body: command.body },
  );
  const v = ragResultSchema.parse(r.data);
  if (
    v.index_id !== command.index ||
    v.release_id !== command.release ||
    v.request_id !== command.body.request_id ||
    v.task_id !== command.body.task_id ||
    v.snapshot_digest !== command.body.expected_snapshot_digest
  )
    throw new Error("Recibo da busca incompatível. Recupere o envio.");
  return v;
}
export function currentRAGIndex(v?: RAGAvailability) {
  return v?.indexes.find(
    (i) => JSON.stringify(i.contract) === JSON.stringify(v.contract),
  );
}
export function ragStateLabel(index: RAGIndex) {
  return index.state === "ready"
    ? "Índice pronto"
    : index.embedding_state === "uncertain"
      ? "Resultado dos embeddings incerto"
      : index.embedding_state === "dispatched"
        ? "Tentativa de embeddings reservada"
        : "Embeddings prontos; falta concluir o índice";
}
