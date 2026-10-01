import { z } from "zod";

import {
  evaluationDimensionSchema,
  evaluationTelemetrySchema,
} from "./evaluation-common-schemas";
import { typeDatasetEvaluationSchema } from "./evaluation-type-schemas";
export { evaluationTelemetrySchema } from "./evaluation-common-schemas";

import { inferenceRouteSchema } from "./inference";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const date = z.iso.datetime({ offset: true });
const count = z.int().nonnegative();
const counts = z.record(z.string(), count);
const split = z.enum(["train", "validation"]);
const terminal = z.enum(["completed", "blocked", "uncertain"]);
export const evaluationLimitsSchema = z.strictObject({
  max_cases: z.int().min(1).max(1000),
  max_http_calls: z.int().min(0).max(1000),
  max_output_tokens: z.int().min(0).max(16000000),
  concurrency: z.literal(1),
});
export const evaluationTypeModeSchema = z.enum([
  "deterministic",
  "current",
  "abstention-v1",
]);
export const typeRouteSchema = z
  .strictObject({
    version: z.literal("deadline-type-pipeline-v1"),
    mode: evaluationTypeModeSchema,
    policy_version: z.string(),
    endpoint: z.string(),
    policy: z
      .strictObject({
        model: z.string().min(1),
        max_tokens: z.int().min(128).max(16000),
        reasoning_tokens: count,
        timeout_seconds: z.int().min(1).max(300),
      })
      .nullable(),
  })
  .refine(
    (r) =>
      r.mode === "deterministic"
        ? r.policy === null && r.policy_version === "" && r.endpoint === ""
        : r.policy !== null &&
          r.policy.reasoning_tokens < r.policy.max_tokens &&
          r.policy_version.trim() !== "" &&
          r.endpoint.trim() !== "",
    "Configuração de tipo incompatível.",
  );
export const evaluationSelectionSchema = z
  .strictObject({
    release_id: z.uuid(),
    expected_manifest_digest: digest,
    split,
    limits: evaluationLimitsSchema,
    pipeline: evaluationTypeModeSchema.optional(),
  })
  .refine(
    (s) =>
      !!s.pipeline ||
      (s.limits.max_http_calls >= 1 && s.limits.max_output_tokens >= 1),
    "Anotação completa exige orçamento positivo.",
  );
export const evaluationPreviewSchema = z
  .strictObject({
    digest,
    selection: evaluationSelectionSchema,
    route: inferenceRouteSchema.optional(),
    type_route: typeRouteSchema.optional(),
    route_digest: digest,
    evaluator_version: z.enum([
      "intimation-dimensions-v1",
      "type-projection-v1",
    ]),
    origin: z.enum(["real", "synthetic"]),
    case_count: count.min(1).max(1000),
    planned_http_calls: count.max(1000),
    planned_output_tokens: count.max(16000000),
  })
  .refine(
    (p) =>
      (p.selection.pipeline
        ? !p.route &&
          !!p.type_route &&
          p.type_route.mode === p.selection.pipeline &&
          p.evaluator_version === "type-projection-v1" &&
          p.planned_http_calls <= p.case_count &&
          (p.type_route.mode === "deterministic"
            ? p.planned_http_calls === 0 && p.planned_output_tokens === 0
            : p.planned_output_tokens ===
              p.planned_http_calls * (p.type_route.policy?.max_tokens ?? -1))
        : !!p.route &&
          !p.type_route &&
          p.evaluator_version === "intimation-dimensions-v1" &&
          p.case_count === p.planned_http_calls &&
          p.planned_output_tokens === p.case_count * p.route.max_tokens) &&
      p.case_count <= p.selection.limits.max_cases &&
      p.planned_http_calls <= p.selection.limits.max_http_calls &&
      p.planned_output_tokens <= p.selection.limits.max_output_tokens,
    "Limites do preview incompatíveis.",
  );
export const evaluationPlanSchema = z
  .strictObject({
    id: z.uuid(),
    request_id: z.uuid(),
    definition_digest: digest,
    preview: evaluationPreviewSchema,
    state: z.literal("frozen"),
    frozen_at: date,
    eligible: z.boolean(),
    blockers: z.array(z.string()),
    execution_available: z.boolean(),
    idempotent_replay: z.boolean(),
  })
  .refine(
    (p) => p.definition_digest === p.preview.digest,
    "Definição incompatível.",
  );
export const evaluationPlanSummarySchema = z.strictObject({
  pipeline: evaluationTypeModeSchema.optional(),
  id: z.uuid(),
  release_id: z.uuid(),
  split,
  case_count: count.min(1).max(1000),
  route_digest: digest,
  definition_digest: digest,
  frozen_at: date,
});
export const evaluationRunSchema = z.strictObject({
  report_available: z.boolean().optional(),
  id: z.uuid(),
  plan_id: z.uuid(),
  request_id: z.uuid(),
  definition_digest: digest,
  state: z.enum(["queued", "running", "completed", "blocked", "uncertain"]),
  failure_code: z.string().nullable(),
  requested_at: date,
  finished_at: date.nullable(),
  reserved_http_calls: count,
  reserved_output_tokens: count,
  case_counts: counts,
  telemetry: evaluationTelemetrySchema,
  eligible: z.boolean(),
  blockers: z.array(z.string()),
  idempotent_replay: z.boolean(),
});
const dimensions = z.record(z.string(), evaluationDimensionSchema);
export const evaluationMetricsSchema = z.strictObject({
  cases: count,
  groups: count,
  coverage: z.string(),
  outcomes: counts,
  dimensions,
  critical_candidates: counts,
  cases_with_critical_candidate: count,
  all_scored_dimensions_correct: count,
  expected_total_abstentions: count,
  appropriate_total_abstentions: count,
  telemetry: evaluationTelemetrySchema,
});
const annotationEvaluation = z.strictObject({
  policy_version: z.literal("intimation-dimensions-v1"),
  outcome: z.string(),
  gold_acts: count,
  prediction_acts: count,
  matched_acts: count,
  unmatched_gold_acts: count,
  unmatched_prediction_acts: count,
  ambiguous_alignment: z.boolean(),
  expected_total_abstention: z.boolean(),
  predicted_total_abstention: z.boolean(),
  appropriate_total_abstention: z.boolean(),
  all_scored_dimensions_correct: z.boolean(),
  dimensions,
  critical_candidates: z.array(z.string()),
});
const datasetEvaluation = z.strictObject({
  schema_version: z.literal("intimation-evaluation-v1"),
  policy_version: z.literal("intimation-dimensions-v1"),
  status: z.literal("measured"),
  weighting: z.literal("unweighted_descriptive"),
  execution_evidence: z.literal("server_recorded"),
  production_approved: z.literal(false),
  pipeline: z.strictObject({
    id: z.string(),
    task: z.string(),
    model: z.string(),
    prompt_version: z.string(),
    configuration_digest: digest,
  }),
  origin: z.enum(["real", "synthetic"]),
  selected_split: split,
  other_splits: counts,
  metrics: evaluationMetricsSchema,
  strata: z.record(z.string(), evaluationMetricsSchema),
  qualities: counts,
  samples: z
    .array(
      z.strictObject({
        id: z.uuid(),
        group_digest: digest,
        stratum: z.string(),
        quality: z.string(),
        inclusion_numerator: count.min(1),
        inclusion_denominator: count.min(1),
        evaluation: annotationEvaluation,
        telemetry: evaluationTelemetrySchema,
      }),
    )
    .max(1000),
});
export const evaluationReportCaseSchema = z.strictObject({
  task_id: z.uuid(),
  gold_revision_id: z.uuid(),
  gold_digest: digest,
  input_digest: digest,
  prepared_digest: digest,
  outcome: z.enum(["completed", "failed", "blocked", "uncertain"]),
  failure_code: z.string().nullable(),
  reserved: z.boolean(),
  receipt_digest: digest.nullable(),
  receipt_late: z.boolean().nullable(),
});
const reportShape = {
  id: z.uuid(),
  run_id: z.uuid(),
  plan_id: z.uuid(),
  release_id: z.uuid(),
  definition_digest: digest,
  source_manifest_digest: digest,
  selected_records_digest: digest,
  route_digest: digest,
  split,
  run_state: terminal,
  generated_at: date,
  reserved_http_calls: count,
  reserved_output_tokens: count,
  failure_codes: counts,
  cases: z.array(evaluationReportCaseSchema).min(1).max(1000),
};
export const evaluationReportSchema = z
  .discriminatedUnion("schema_version", [
    z.strictObject({
      ...reportShape,
      schema_version: z.literal("intimation-run-report-v1"),
      evaluation: datasetEvaluation,
    }),
    z.strictObject({
      ...reportShape,
      schema_version: z.literal("intimation-type-run-report-v1"),
      type_evaluation: typeDatasetEvaluationSchema,
    }),
  ])
  .refine((r) => {
    const e =
      r.schema_version === "intimation-run-report-v1"
        ? r.evaluation
        : r.type_evaluation;
    return (
      r.split === e.selected_split &&
      r.route_digest === e.pipeline.configuration_digest &&
      r.cases.length === e.metrics.cases &&
      r.cases.length === e.samples.length &&
      new Set(r.cases.map((c) => c.task_id)).size === r.cases.length &&
      new Set(e.samples.map((sample) => sample.id)).size === e.samples.length &&
      r.cases.every((c) =>
        e.samples.some((sample) => sample.id === c.gold_revision_id),
      )
    );
  }, "Relatório incompatível.");
export const evaluationDeliverySchema = z.strictObject({
  report: evaluationReportSchema,
  digest,
  request_id: z.uuid(),
  delivery_id: z.uuid(),
  idempotent_replay: z.boolean(),
});
export const evaluationMetadataSchema = z.strictObject({
  id: z.uuid(),
  run_id: z.uuid(),
  plan_id: z.uuid(),
  definition_digest: digest,
  digest,
  evaluator_version: z.enum(["intimation-dimensions-v1", "type-projection-v1"]),
  case_count: count.min(1).max(1000),
  generated_at: date,
  eligible: z.boolean(),
  blockers: z.array(z.string()),
});
export type EvaluationSelection = z.infer<typeof evaluationSelectionSchema>;
export type EvaluationPreview = z.infer<typeof evaluationPreviewSchema>;
export type EvaluationPlan = z.infer<typeof evaluationPlanSchema>;
export type EvaluationRun = z.infer<typeof evaluationRunSchema>;
export type EvaluationDelivery = z.infer<typeof evaluationDeliverySchema>;
export type EvaluationMetrics = z.infer<typeof evaluationMetricsSchema>;
export type EvaluationTelemetry = z.infer<typeof evaluationTelemetrySchema>;
