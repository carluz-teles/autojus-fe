import { z } from "zod";

import {
  evaluationDimensionSchema,
  evaluationTelemetrySchema,
} from "./evaluation-common-schemas";

const count = z.int().nonnegative();
const counts = z.record(z.string(), count);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const prediction = z.strictObject({
  act_type: z.string().min(1),
  actionability: z.string(),
  origin: z.string(),
  type_requires_review: z.boolean(),
  interest_requires_review: z.boolean(),
  procedure_override: z.string(),
});
const target = z.union([
  z.strictObject({ act_type: z.string().min(1) }),
  z.strictObject({
    abstention_reason: z.enum([
      "insufficient_context",
      "multiple_acts",
      "unresolved_type",
      "non_client_recipient",
    ]),
  }),
]);
export const typeProjectionScoreSchema = z
  .strictObject({
    policy_version: z.literal("type-projection-v1"),
    outcome: z.enum(["completed", "failed", "blocked", "uncertain"]),
    target,
    prediction: prediction.nullable(),
    resolved: z.boolean(),
    expected_abstention: z.boolean(),
    appropriate_abstention: z.boolean(),
    type: evaluationDimensionSchema,
    critical_candidates: z.array(z.string()),
  })
  .refine((s) => {
    const usable = s.outcome === "completed";
    const resolved =
      !!s.prediction &&
      !s.prediction.type_requires_review &&
      s.prediction.act_type !== "indeterminado";
    return (
      usable === (s.prediction !== null) &&
      s.resolved === resolved &&
      s.expected_abstention === "abstention_reason" in s.target &&
      s.appropriate_abstention ===
        (usable && s.expected_abstention && !resolved)
    );
  }, "Abstenção ou previsão incompatível com o resultado.");
export const typeEvaluationMetricsSchema = z
  .strictObject({
    cases: count,
    groups: count,
    coverage: z.enum(["empty", "single_group", "multiple_groups"]),
    outcomes: counts,
    type: evaluationDimensionSchema,
    expected_abstentions: count,
    appropriate_abstentions: count,
    resolved_predictions: count,
    critical_candidates: counts,
    telemetry: evaluationTelemetrySchema,
  })
  .refine(
    (m) =>
      m.cases === Object.values(m.outcomes).reduce((a, b) => a + b, 0) &&
      m.cases === m.type.known_targets + m.type.unknown_targets &&
      m.expected_abstentions === m.type.unknown_targets &&
      m.appropriate_abstentions === m.type.appropriate_abstentions &&
      m.appropriate_abstentions <= m.expected_abstentions &&
      m.resolved_predictions <= (m.outcomes.completed ?? 0) &&
      m.groups <= m.cases,
    "Denominador de tipo incompatível.",
  );
export const typeDatasetEvaluationSchema = z.strictObject({
  schema_version: z.literal("intimation-type-evaluation-v1"),
  policy_version: z.literal("type-projection-v1"),
  scope: z.literal("commercial_type_projection_only"),
  status: z.literal("measured"),
  weighting: z.literal("unweighted_descriptive"),
  execution_evidence: z.literal("server_recorded"),
  production_approved: z.literal(false),
  pipeline: z.strictObject({
    id: z.enum(["deterministic", "current", "abstention-v1"]),
    task: z.literal("deadline.classify_type"),
    model: z.string(),
    prompt_version: z.literal("deadline-type-pipeline-v1"),
    configuration_digest: digest,
  }),
  origin: z.enum(["real", "synthetic"]),
  selected_split: z.enum(["train", "validation"]),
  other_splits: counts,
  metrics: typeEvaluationMetricsSchema,
  strata: z.record(z.string(), typeEvaluationMetricsSchema),
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
        evaluation: typeProjectionScoreSchema,
        telemetry: evaluationTelemetrySchema,
      }),
    )
    .min(1)
    .max(1000),
});
export type TypeEvaluationMetrics = z.infer<typeof typeEvaluationMetricsSchema>;
