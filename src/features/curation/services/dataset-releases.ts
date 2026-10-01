import { z } from "zod";

import type { ApiBinaryFetcher, ApiFetcher } from "@/lib/api/use-api";

import type {
  AnnotationBatchSummary,
  AnnotationPage,
} from "./annotation-assignments";
import type { SamplingSplit } from "./sampling";
export type ReleasePurpose = "evaluation" | "training" | "rag";
export interface ReleaseItem {
  task_id: string;
  gold_revision_id: string | null;
  content_digest: string | null;
  snapshot_digest: string;
  group_digest: string;
  split: SamplingSplit;
  stratum: string;
  inclusion_numerator: number;
  inclusion_denominator: number;
  quality: string | null;
  included: boolean;
  reasons: string[];
}
export interface ReleaseManifest {
  schema_version: string;
  policy_version: string;
  task_kind: string;
  batch_id: string;
  frame_id: string;
  frame_digest: string;
  protocol_id: string;
  protocol_digest: string;
  origin: "real" | "synthetic";
  purpose: ReleasePurpose;
  included_count: number;
  excluded_count: number;
  split_counts: Record<SamplingSplit, number>;
  items: ReleaseItem[];
}
export interface ReleasePreview {
  digest: string;
  manifest: ReleaseManifest;
}
export interface ReleaseBlocker {
  task_id: string | null;
  reasons: string[];
}
export interface DatasetRelease {
  id: string;
  name: string;
  manifest_digest: string;
  manifest: ReleaseManifest;
  frozen_at: string;
  eligible: boolean;
  withdrawn: boolean;
  blockers: ReleaseBlocker[];
  idempotent_replay: boolean;
}
export interface ReleaseSummary {
  id: string;
  batch_id: string;
  name: string;
  purpose: ReleasePurpose;
  origin: "real" | "synthetic";
  manifest_digest: string;
  included_count: number;
  excluded_count: number;
  frozen_at: string;
  withdrawn: boolean;
}
export interface DatasetPublication {
  canonical_digest: string;
  manifest_digest: string;
  canonical_bytes: number;
  published_at: string;
  cleanup_state: "none" | "pending" | "complete";
}
export interface PublicationJob {
  id: string;
  release_id: string;
  state: "queued" | "running" | "published" | "failed" | "blocked";
  attempts: number;
  failure_code: string | null;
  requested_at: string;
  updated_at: string;
  available: boolean;
  blockers: ReleaseBlocker[];
  publication: DatasetPublication | null;
  idempotent_replay: boolean;
}
export interface DownloadDelivery {
  id: string;
  request_id: string;
  actor_id: string;
  issued_at: string;
  bundle_digest: string;
  bundle_bytes: number;
  format_version: string;
}
export interface DownloadCommand {
  release_id: string;
  request_id: string;
  expected_manifest_digest: string;
  publication: Pick<
    DatasetPublication,
    "manifest_digest" | "canonical_digest" | "canonical_bytes"
  >;
}
export const releaseKeys = {
  all: ["curation", "releases"] as const,
  preview: (batch: string, purpose: string) =>
    ["curation", "releases", "preview", batch, purpose] as const,
  detail: (id: string) => ["curation", "releases", "detail", id] as const,
  jobs: (id: string) => ["curation", "releases", "jobs", id] as const,
  deliveries: (id: string) =>
    ["curation", "releases", "deliveries", id] as const,
};
export const releaseFormSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome do dataset.")
    .refine(
      (v) => new TextEncoder().encode(v).length <= 200,
      "Nome excede 200 bytes.",
    ),
  purpose: z.enum(["evaluation", "training", "rag"]),
  confirmed: z.boolean(),
  preview_digest: z.string(),
});
export type ReleaseFormValues = z.infer<typeof releaseFormSchema>;
export function releaseBody(
  raw: ReleaseFormValues,
  p: ReleasePreview | undefined,
  batch: string,
  request: string,
) {
  const f = releaseFormSchema.parse(raw);
  if (
    !p ||
    p.manifest.batch_id !== batch ||
    p.manifest.purpose !== f.purpose ||
    p.manifest.included_count < 1 ||
    !f.confirmed ||
    f.preview_digest !== p.digest
  )
    throw new Error(
      "Confira e confirme o preview atual com pelo menos um item incluído.",
    );
  return {
    request_id: request,
    batch_id: batch,
    purpose: f.purpose,
    expected_preview_digest: p.digest,
    name: f.name,
  };
}
const root = "/v1/curation",
  page = (cursor: string | null) =>
    `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
export function listPublicationBatches(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<AnnotationBatchSummary>>(
    `${root}/publication-batches?${page(cursor)}`,
    { signal },
  );
}
export function listReleases(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<ReleaseSummary>>(
    `${root}/dataset-releases?${page(cursor)}`,
    { signal },
  );
}
export async function getReleasePreview(
  api: ApiFetcher,
  batch: string,
  purpose: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: ReleasePreview }>(
    `${root}/annotation-batches/${encodeURIComponent(batch)}/release-preview`,
    { query: { purpose }, signal },
  );
  if (data.manifest.batch_id !== batch || data.manifest.purpose !== purpose)
    throw new Error("Preview recebido não corresponde à seleção.");
  return data;
}
export async function createRelease(
  api: ApiFetcher,
  body: ReturnType<typeof releaseBody>,
) {
  const { data } = await api<{ data: DatasetRelease }>(
    `${root}/dataset-releases`,
    { method: "POST", body },
  );
  if (
    data.manifest.batch_id !== body.batch_id ||
    data.manifest.purpose !== body.purpose ||
    data.manifest_digest !== body.expected_preview_digest
  )
    throw new Error("Recupere o envio para conferir o recibo do dataset.");
  return data;
}
export async function getRelease(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: DatasetRelease }>(
    `${root}/dataset-releases/${encodeURIComponent(id)}`,
    { signal },
  );
  if (data.id !== id)
    throw new Error("Dataset recebido não corresponde ao solicitado.");
  return data;
}
export async function listPublicationJobs(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: PublicationJob[] }>(
    `${root}/dataset-releases/${encodeURIComponent(id)}/publication-jobs`,
    { signal },
  );
  if (data.some((job) => job.release_id !== id) || data.length > 8)
    throw new Error("Pedidos de publicação incompatíveis com o dataset.");
  return data;
}
export async function publishRelease(
  api: ApiFetcher,
  id: string,
  body: { request_id: string; expected_manifest_digest: string },
) {
  const { data } = await api<{ data: PublicationJob }>(
    `${root}/dataset-releases/${encodeURIComponent(id)}/publication-jobs`,
    { method: "POST", body },
  );
  if (data.release_id !== id)
    throw new Error("Recupere o pedido de publicação.");
  return data;
}
export async function withdrawRelease(
  api: ApiFetcher,
  id: string,
  body: { request_id: string; reason: string },
) {
  const { data } = await api<{ data: DatasetRelease }>(
    `${root}/dataset-releases/${encodeURIComponent(id)}/withdrawals`,
    { method: "POST", body },
  );
  if (data.id !== id || !data.withdrawn)
    throw new Error("Recupere a retirada do dataset.");
  return data;
}
export function listDownloads(
  api: ApiFetcher,
  id: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<DownloadDelivery>>(
    `${root}/dataset-releases/${encodeURIComponent(id)}/downloads?${page(cursor)}`,
    { signal },
  );
}
export function publicationPoll(
  jobs: PublicationJob[] | undefined,
  status: string,
) {
  return status !== "error" &&
    jobs?.some((j) => j.state === "queued" || j.state === "running")
    ? 3000
    : false;
}
const downloadHeaders = [
  "X-Dataset-Release-Id",
  "X-Dataset-Request-Id",
  "X-Dataset-Delivery-Id",
  "X-Dataset-Source-Manifest-Sha256",
  "X-Dataset-Manifest-Sha256",
  "X-Dataset-Canonical-Sha256",
  "X-Dataset-Canonical-Bytes",
  "X-Dataset-Bundle-Sha256",
  "X-Idempotent-Replay",
];
export async function downloadDataset(
  api: ApiBinaryFetcher,
  command: DownloadCommand,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  const result = await api(
    `${root}/dataset-releases/${encodeURIComponent(command.release_id)}/downloads`,
    {
      method: "POST",
      body: {
        request_id: command.request_id,
        expected_manifest_digest: command.expected_manifest_digest,
      },
      signal,
      maxBytes: 276828160,
      expectedContentType: "application/zip",
      responseHeaders: downloadHeaders,
    },
  );
  const h = result.headers;
  if (
    h["x-dataset-release-id"] !== command.release_id ||
    h["x-dataset-request-id"] !== command.request_id ||
    !z.uuid().safeParse(h["x-dataset-delivery-id"]).success ||
    h["x-dataset-source-manifest-sha256"] !==
      command.expected_manifest_digest ||
    h["x-dataset-manifest-sha256"] !== command.publication.manifest_digest ||
    h["x-dataset-canonical-sha256"] !== command.publication.canonical_digest ||
    h["x-dataset-canonical-bytes"] !==
      String(command.publication.canonical_bytes) ||
    !/^[a-f0-9]{64}$/.test(h["x-dataset-bundle-sha256"] ?? "") ||
    !["true", "false"].includes(h["x-idempotent-replay"])
  )
    throw new Error(
      "Recibo de download incompatível com a publicação conferida.",
    );
  const bytes = await result.blob.arrayBuffer();
  signal?.throwIfAborted();
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  signal?.throwIfAborted();
  if (digest !== h["x-dataset-bundle-sha256"])
    throw new Error("A integridade do arquivo recebido não foi confirmada.");
  return {
    blob: result.blob,
    filename: `dataset-${command.release_id}.zip`,
    delivery_id: h["x-dataset-delivery-id"],
    request_id: command.request_id,
    digest,
    bytes: result.blob.size,
  };
}
export const jobStateLabels: Record<PublicationJob["state"], string> = {
  queued: "Na fila",
  running: "Publicando",
  published: "Publicado",
  failed: "Falhou",
  blocked: "Bloqueado",
};
