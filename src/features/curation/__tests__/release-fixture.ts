import type {
  DatasetRelease,
  PublicationJob,
} from "../services/dataset-releases";
export function releaseFixture(): DatasetRelease {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Synthetic dataset",
    manifest_digest: "a".repeat(64),
    frozen_at: "2026-09-30T12:00:00Z",
    eligible: true,
    withdrawn: false,
    blockers: [],
    idempotent_replay: false,
    manifest: {
      schema_version: "intimation-release-v1",
      policy_version: "intimation-release-policy-v1",
      task_kind: "intimation_annotation",
      batch_id: "22222222-2222-4222-8222-222222222222",
      frame_id: "frame",
      frame_digest: "d".repeat(64),
      protocol_id: "protocol",
      protocol_digest: "e".repeat(64),
      origin: "synthetic",
      purpose: "evaluation",
      included_count: 1,
      excluded_count: 0,
      split_counts: { train: 1, validation: 0, test: 0 },
      items: [],
    },
  };
}
export function publicationFixture(): PublicationJob {
  return {
    id: "job",
    release_id: releaseFixture().id,
    state: "published",
    attempts: 1,
    failure_code: null,
    requested_at: "2026-09-30T12:00:00Z",
    updated_at: "2026-09-30T12:00:00Z",
    available: true,
    blockers: [],
    idempotent_replay: false,
    publication: {
      manifest_digest: "b".repeat(64),
      canonical_digest: "c".repeat(64),
      canonical_bytes: 5,
      published_at: "2026-09-30T12:00:00Z",
      cleanup_state: "none",
    },
  };
}
