import { z } from "zod";

import {
  candidateDocumentSchema,
  candidatePolicySchema,
} from "./candidate-schemas";
import { caseSchema, pairSchema } from "./comparison-schemas";
import { evaluationTelemetrySchema } from "./evaluation-common-schemas";
import {
  evaluationLimitsSchema,
  evaluationMetadataSchema,
  evaluationReportCaseSchema,
  evaluationRunSchema,
  typeRouteSchema,
} from "./evaluation-schemas";
import {
  typeEvaluationMetricsSchema,
  typeProjectionScoreSchema,
} from "./evaluation-type-schemas";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const count = z.int().nonnegative();
const terminal = z.enum(["completed", "blocked", "uncertain"]);
const strata = [
  "resolved",
  "residual",
  "rare",
  "insufficient_context",
] as const;
export const closedLimitsSchema = evaluationLimitsSchema.extend({
  max_http_calls: count.max(2000),
  max_output_tokens: count.max(32000000),
});
export const closedSelectionSchema = z.strictObject({
  expected_candidate_digest: digest,
  expected_manifest_digest: digest,
  limits: closedLimitsSchema,
  reason: candidateDocumentSchema.shape.reason,
});
const sourceSchema = z.strictObject({
  report_id: z.uuid(),
  plan_id: z.uuid(),
  definition_digest: digest,
  route_digest: digest,
  route: typeRouteSchema,
});
export const closedPreviewSchema = z
  .strictObject({
    digest,
    candidate_id: z.uuid(),
    release_id: z.uuid(),
    origin: z.enum(["real", "synthetic"]),
    selection: closedSelectionSchema,
    baseline: sourceSchema,
    candidate: sourceSchema,
    policy: candidatePolicySchema,
    case_count: count.min(1).max(1000),
    group_count: count.min(1),
    planned_http_calls: count.max(2000),
    planned_output_tokens: count.max(32000000),
  })
  .refine(
    (p) =>
      p.baseline.report_id !== p.candidate.report_id &&
      p.group_count <= p.case_count &&
      p.case_count <= p.selection.limits.max_cases &&
      p.planned_http_calls <= 2 * p.case_count &&
      p.planned_http_calls <= p.selection.limits.max_http_calls &&
      p.planned_output_tokens <= p.selection.limits.max_output_tokens &&
      (p.planned_http_calls > 0 || p.planned_output_tokens === 0),
    "Orçamento ou fontes do teste incompatíveis.",
  );
const eligibility = { eligible: z.boolean(), blockers: z.array(z.string()) };
export const closedReservationSchema = z
  .strictObject({
    id: z.uuid(),
    request_id: z.uuid(),
    preview: closedPreviewSchema,
    reserved_at: z.iso.datetime({ offset: true }),
    ...eligibility,
    execution_available: z.boolean(),
    idempotent_replay: z.boolean(),
  })
  .refine((v) => v.eligible === (v.blockers.length === 0));
export const closedRunSchema = evaluationRunSchema
  .omit({ plan_id: true, case_counts: true })
  .extend({
    reservation_id: z.uuid(),
    pair_count: count.min(1).max(1000),
    work_counts: z.partialRecord(
      z.enum([
        "queued",
        "running",
        "completed",
        "failed",
        "blocked",
        "uncertain",
      ]),
      count,
    ),
    report_available: z.boolean(),
  })
  .refine(
    (r) =>
      r.eligible === (r.blockers.length === 0) &&
      Object.values(r.work_counts).reduce((a, b) => a + (b ?? 0), 0) ===
        2 * r.pair_count &&
      terminal.safeParse(r.state).success === (r.finished_at !== null),
    "Progresso pareado incompatível.",
  );
const groupSchema = z
  .strictObject({
    status: z.enum(["passed", "failed", "insufficient", "not_required"]),
    cases: count,
    groups: count,
    acceptable: count,
    critical: count,
    unavailable: count,
    regressed: count,
  })
  .refine(
    (g) =>
      g.groups <= g.cases &&
      [g.acceptable, g.critical, g.unavailable, g.regressed].every(
        (n) => n <= g.cases,
      ),
  );
const assessmentSchema = z.strictObject({
  policy_version: z.literal("type-candidate-criteria-v1"),
  status: z.enum(["passed", "failed", "insufficient"]),
  overall: groupSchema,
  strata: z.strictObject({
    resolved: groupSchema,
    residual: groupSchema,
    rare: groupSchema,
    insufficient_context: groupSchema,
  }),
  production_approved: z.literal(false),
});
const stageSchema = evaluationReportCaseSchema.extend({
  role: z.enum(["baseline", "candidate"]),
  telemetry: evaluationTelemetrySchema,
});
export const closedReportSchema = z
  .strictObject({
    schema_version: z.literal("closed-type-report-v1"),
    id: z.uuid(),
    run_id: z.uuid(),
    reservation_id: z.uuid(),
    candidate_id: z.uuid(),
    release_id: z.uuid(),
    definition_digest: digest,
    source_manifest_digest: digest,
    scope: z.literal("commercial_type_projection_only"),
    execution_evidence: z.literal("server_recorded"),
    split: z.literal("test"),
    origin: z.enum(["real", "synthetic"]),
    run_state: terminal,
    production_approved: z.literal(false),
    generated_at: z.iso.datetime({ offset: true }),
    baseline: sourceSchema,
    candidate: sourceSchema,
    policy: candidatePolicySchema,
    cases: z
      .array(
        caseSchema.safeExtend({
          scores: z.array(typeProjectionScoreSchema).length(2),
        }),
      )
      .min(1)
      .max(1000),
    stages: z.array(stageSchema).min(2).max(2000),
    reserved_http_calls: count.max(2000),
    reserved_output_tokens: count.max(32000000),
    baseline_metrics: typeEvaluationMetricsSchema,
    candidate_metrics: typeEvaluationMetricsSchema,
    pair: pairSchema.extend({
      baseline: z.literal(0),
      candidate: z.literal(1),
    }),
    assessment: assessmentSchema,
    conclusion: z.enum([
      "passed",
      "failed",
      "insufficient",
      "incomplete_execution",
    ]),
    failure_codes: z.record(z.string(), count),
  })
  .refine((r) => {
    const n = r.cases.length,
      groups = new Set(r.cases.map((c) => c.group_digest)).size;
    if (
      r.stages.length !== 2 * n ||
      new Set(r.cases.map((c) => c.task_id)).size !== n ||
      new Set(r.cases.map((c) => c.gold_revision_id)).size !== n ||
      r.baseline.report_id === r.candidate.report_id ||
      new Set(r.stages.map((s) => `${s.task_id}/${s.role}`)).size !== 2 * n ||
      r.conclusion !==
        (r.run_state === "completed"
          ? r.assessment.status
          : "incomplete_execution")
    )
      return false;
    if (
      ![
        r.baseline_metrics,
        r.candidate_metrics,
        r.pair.metrics,
        r.assessment.overall,
      ].every((m) => m.cases === n && m.groups === groups)
    )
      return false;
    if (
      !strata.every((key) => {
        const cases = r.cases.filter((c) => c.stratum === key),
          size = new Set(cases.map((c) => c.group_digest)).size;
        return (
          [r.pair.strata[key], r.assessment.strata[key]].every(
            (m) => m.cases === cases.length && m.groups === size,
          ) &&
          (r.policy.strata[key] === null) ===
            (r.assessment.strata[key].status === "not_required")
        );
      })
    )
      return false;
    return r.stages.every((s) => {
      const c = r.cases.find((c) => c.task_id === s.task_id),
        score = c?.scores[s.role === "baseline" ? 0 : 1];
      return (
        c?.gold_revision_id === s.gold_revision_id &&
        c.gold_digest === s.gold_digest &&
        c.input_digest === s.input_digest &&
        score?.outcome === s.outcome &&
        (s.outcome !== "completed" ||
          (s.reserved &&
            s.receipt_digest !== null &&
            s.receipt_late === false &&
            s.failure_code === null))
      );
    });
  }, "Relatório fechado incompatível com as evidências pareadas.");
export const closedDeliverySchema = z.strictObject({
  report: closedReportSchema,
  digest,
  request_id: z.uuid(),
  delivery_id: z.uuid(),
  idempotent_replay: z.boolean(),
});
export const closedMetadataSchema = evaluationMetadataSchema
  .omit({ plan_id: true })
  .extend({
    reservation_id: z.uuid(),
    evaluator_version: z.literal("type-projection-v1"),
  })
  .refine((m) => m.eligible === (m.blockers.length === 0));
export type ClosedSelection = z.infer<typeof closedSelectionSchema>;
export type ClosedPreview = z.infer<typeof closedPreviewSchema>;
export type ClosedReservation = z.infer<typeof closedReservationSchema>;
export type ClosedRun = z.infer<typeof closedRunSchema>;
export type ClosedDelivery = z.infer<typeof closedDeliverySchema>;
