import type {
  ClosedDelivery,
  ClosedPreview,
  ClosedReservation,
  ClosedRun,
} from "../services/closed-test-schemas";
import { candidateFixture } from "./candidate-fixture";
import { releaseFixture } from "./release-fixture";

export function closedTestFixture() {
  const f = candidateFixture(),
    comparison = f.delivery.document.comparison;
  const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const release = releaseFixture();
  release.manifest_digest = f.preview.selection.expected_manifest_digest;
  release.manifest.split_counts = { train: 0, validation: 0, test: 1 };
  const preview: ClosedPreview = {
    digest: "9".repeat(64),
    candidate_id: f.candidateID,
    release_id: f.ids.release,
    origin: "synthetic",
    selection: {
      expected_candidate_digest: f.candidate.digest,
      expected_manifest_digest: release.manifest_digest,
      limits: {
        max_cases: 1,
        max_http_calls: 0,
        max_output_tokens: 0,
        concurrency: 1,
      },
      reason: "Teste com casos sintéticos.",
    },
    baseline: {
      report_id: f.sources[0].report_id,
      plan_id: f.sources[0].plan_id,
      definition_digest: f.plan.definition_digest,
      route_digest: f.sources[0].pipeline.configuration_digest,
      route: {
        version: "deadline-type-pipeline-v1",
        mode: "deterministic",
        policy: null,
        policy_version: "",
        endpoint: "",
      },
    },
    candidate: {
      report_id: f.sources[1].report_id,
      plan_id: f.sources[1].plan_id,
      definition_digest: f.plan.definition_digest,
      route_digest: f.candidate.document.route_digest,
      route: f.candidate.document.route,
    },
    policy: f.policy,
    case_count: 1,
    group_count: 1,
    planned_http_calls: 0,
    planned_output_tokens: 0,
  };
  const reservation: ClosedReservation = {
    id,
    request_id: f.ids.request,
    preview,
    reserved_at: f.plan.frozen_at,
    eligible: true,
    blockers: [],
    execution_available: true,
    idempotent_replay: false,
  };
  const metrics = comparison.sources[0].metrics;
  const telemetry = {
    ...metrics.telemetry,
    known_cost_cases: 2,
    known_call_cases: 2,
    unknown_latency_cases: 2,
  };
  const run: ClosedRun = {
    id: f.ids.run,
    reservation_id: id,
    request_id: f.ids.request,
    definition_digest: preview.digest,
    state: "completed",
    failure_code: null,
    requested_at: f.plan.frozen_at,
    finished_at: f.plan.frozen_at,
    pair_count: 1,
    work_counts: { completed: 2 },
    reserved_http_calls: 0,
    reserved_output_tokens: 0,
    telemetry,
    eligible: true,
    blockers: [],
    idempotent_replay: false,
    report_available: true,
  };
  const cases = comparison.cases.map((c) => ({
    ...c,
    scores: c.scores.slice(0, 2),
  }));
  const group = {
    status: "passed" as const,
    cases: 1,
    groups: 1,
    acceptable: 1,
    critical: 0,
    unavailable: 0,
    regressed: 0,
  };
  const empty = {
    ...group,
    status: "not_required" as const,
    cases: 0,
    groups: 0,
    acceptable: 0,
  };
  const delivery: ClosedDelivery = {
    digest: "8".repeat(64),
    request_id: f.ids.request,
    delivery_id: f.ids.delivery,
    idempotent_replay: false,
    report: {
      schema_version: "closed-type-report-v1",
      id: f.ids.report,
      run_id: f.ids.run,
      reservation_id: id,
      candidate_id: f.candidateID,
      release_id: f.ids.release,
      definition_digest: preview.digest,
      source_manifest_digest: release.manifest_digest,
      scope: "commercial_type_projection_only",
      execution_evidence: "server_recorded",
      split: "test",
      origin: "synthetic",
      run_state: "completed",
      production_approved: false,
      generated_at: f.plan.frozen_at,
      baseline: preview.baseline,
      candidate: preview.candidate,
      policy: preview.policy,
      cases,
      stages: cases.flatMap((c) =>
        (["baseline", "candidate"] as const).map((role) => ({
          task_id: c.task_id,
          gold_revision_id: c.gold_revision_id,
          gold_digest: c.gold_digest,
          input_digest: c.input_digest,
          prepared_digest: "6".repeat(64),
          outcome: "completed" as const,
          failure_code: null,
          reserved: true,
          receipt_digest: "7".repeat(64),
          receipt_late: false,
          role,
          telemetry: metrics.telemetry,
        })),
      ),
      reserved_http_calls: 0,
      reserved_output_tokens: 0,
      baseline_metrics: metrics,
      candidate_metrics: metrics,
      pair: { ...comparison.pairs[0], baseline: 0, candidate: 1 },
      assessment: {
        policy_version: "type-candidate-criteria-v1",
        status: "passed",
        overall: group,
        strata: {
          resolved: empty,
          residual: empty,
          rare: { ...group, status: "not_required" },
          insufficient_context: empty,
        },
        production_approved: false,
      },
      conclusion: "passed",
      failure_codes: {},
    },
  };
  const metadata = {
    id: f.ids.report,
    run_id: run.id,
    reservation_id: id,
    definition_digest: preview.digest,
    digest: delivery.digest,
    evaluator_version: "type-projection-v1" as const,
    case_count: 1,
    generated_at: f.plan.frozen_at,
    eligible: true,
    blockers: [] as string[],
  };
  return { ...f, release, preview, reservation, run, delivery, metadata };
}
