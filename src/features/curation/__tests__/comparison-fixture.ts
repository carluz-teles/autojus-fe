import type { ComparisonDelivery } from "../services/comparison-schemas";
import { typeEvaluationFixture } from "./evaluation-fixture";

export function comparisonFixture() {
  const f = typeEvaluationFixture();
  const e = f.delivery.report.type_evaluation;
  const id = "99999999-9999-4999-8999-999999999999";
  const sources = ["deterministic", "current", "abstention-v1"].map(
    (mode, i) => ({
      report_id: `55555555-5555-4555-8555-55555555555${i}`,
      run_id: `33333333-3333-4333-8333-33333333333${i}`,
      plan_id: `22222222-2222-4222-8222-22222222222${i}`,
      pipeline: {
        ...e.pipeline,
        id: mode as typeof e.pipeline.id | "current" | "abstention-v1",
        model: i ? "synthetic/model" : "",
      },
      metrics: e.metrics,
    }),
  );
  const refs = sources.map((s) => ({
    report_id: s.report_id,
    expected_digest: "d".repeat(64),
  }));
  const metrics = {
    cases: 1,
    groups: 1,
    improved: 0,
    regressed: 0,
    both_acceptable: 1,
    neither_acceptable: 0,
    baseline_unavailable: 0,
    candidate_unavailable: 0,
    transitions: { "appropriate_abstention/appropriate_abstention": 1 },
  };
  const empty = {
    ...metrics,
    cases: 0,
    groups: 0,
    both_acceptable: 0,
    transitions: {},
  };
  const delivery: ComparisonDelivery = {
    digest: "a".repeat(64),
    request_id: f.ids.request,
    delivery_id: f.ids.delivery,
    idempotent_replay: false,
    document: {
      id,
      source_digest: "b".repeat(64),
      created_at: f.plan.frozen_at,
      source_reports: refs,
      comparison: {
        schema_version: "type-report-comparison-v1",
        scope: "commercial_type_projection_only",
        release_id: f.ids.release,
        source_manifest_digest: f.preview.selection.expected_manifest_digest,
        selected_records_digest: "e".repeat(64),
        split: "validation",
        origin: "synthetic",
        production_approved: false,
        sources,
        cases: [
          {
            task_id: f.ids.task,
            gold_revision_id: f.ids.gold,
            gold_digest: "f".repeat(64),
            input_digest: "a".repeat(64),
            group_digest: e.samples[0].group_digest,
            stratum: "rare",
            quality: "blind_control",
            inclusion_numerator: 1,
            inclusion_denominator: 2,
            scores: sources.map(() => e.samples[0].evaluation),
          },
        ],
        pairs: [
          [0, 1],
          [0, 2],
          [1, 2],
        ].map(([baseline, candidate]) => ({
          baseline,
          candidate,
          metrics,
          strata: {
            resolved: empty,
            residual: empty,
            rare: metrics,
            insufficient_context: empty,
          },
        })),
      },
    },
  };
  const metadata = {
    id,
    release_id: f.ids.release,
    split: "validation" as const,
    source_digest: delivery.document.source_digest,
    digest: delivery.digest,
    case_count: 1,
    source_count: 3,
    created_at: f.plan.frozen_at,
    source_reports: refs,
    eligible: true,
    blockers: [] as string[],
  };
  const plans = sources.map((s) => ({
    id: s.plan_id,
    release_id: f.ids.release,
    split: "validation" as const,
    pipeline: s.pipeline.id,
    case_count: 1,
    route_digest: s.pipeline.configuration_digest,
    definition_digest: f.plan.definition_digest,
    frozen_at: f.plan.frozen_at,
  }));
  return { ...f, comparisonID: id, delivery, metadata, plans, sources, refs };
}
