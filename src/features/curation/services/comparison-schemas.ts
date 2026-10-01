import { z } from "zod";

import {
  typeDatasetEvaluationSchema,
  typeEvaluationMetricsSchema,
  typeProjectionScoreSchema,
} from "./evaluation-type-schemas";

const count = z.int().nonnegative();
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const strata = [
  "resolved",
  "residual",
  "rare",
  "insufficient_context",
] as const;
const refSchema = z.strictObject({
  report_id: z.uuid(),
  expected_digest: digest,
});
const refsSchema = z
  .array(refSchema)
  .min(2)
  .max(3)
  .refine((r) => new Set(r.map((v) => v.report_id)).size === r.length);
export const pairMetricsSchema = z
  .strictObject({
    cases: count,
    groups: count,
    improved: count,
    regressed: count,
    both_acceptable: count,
    neither_acceptable: count,
    baseline_unavailable: count,
    candidate_unavailable: count,
    transitions: z.record(z.string(), count),
  })
  .refine(
    (m) =>
      m.cases ===
        m.improved + m.regressed + m.both_acceptable + m.neither_acceptable &&
      m.cases === Object.values(m.transitions).reduce((a, b) => a + b, 0) &&
      m.groups <= m.cases &&
      (m.cases === 0 || m.groups > 0) &&
      m.baseline_unavailable <= m.cases &&
      m.candidate_unavailable <= m.cases,
    "Contagens pareadas incompatíveis.",
  );
export const pairSchema = z.strictObject({
  baseline: count.max(1),
  candidate: count.min(1).max(2),
  metrics: pairMetricsSchema,
  strata: z.strictObject({
    resolved: pairMetricsSchema,
    residual: pairMetricsSchema,
    rare: pairMetricsSchema,
    insufficient_context: pairMetricsSchema,
  }),
});
export const caseSchema = z
  .strictObject({
    task_id: z.uuid(),
    gold_revision_id: z.uuid(),
    gold_digest: digest,
    input_digest: digest,
    group_digest: digest,
    stratum: z.enum(strata),
    quality: z.enum([
      "assisted_reviewed",
      "blind_control",
      "double_blind",
      "adjudicated",
    ]),
    inclusion_numerator: count.min(1),
    inclusion_denominator: count.min(1),
    scores: z.array(typeProjectionScoreSchema).min(2).max(3),
  })
  .refine(
    (c) =>
      c.inclusion_numerator <= c.inclusion_denominator &&
      c.scores.every(
        (s) => JSON.stringify(s.target) === JSON.stringify(c.scores[0].target),
      ),
    "Amostra ou alvos incompatíveis.",
  );
const comparisonSchema = z
  .strictObject({
    schema_version: z.literal("type-report-comparison-v1"),
    scope: z.literal("commercial_type_projection_only"),
    release_id: z.uuid(),
    source_manifest_digest: digest,
    selected_records_digest: digest,
    split: z.enum(["train", "validation"]),
    origin: z.enum(["real", "synthetic"]),
    production_approved: z.literal(false),
    sources: z
      .array(
        z.strictObject({
          report_id: z.uuid(),
          run_id: z.uuid(),
          plan_id: z.uuid(),
          pipeline: typeDatasetEvaluationSchema.shape.pipeline,
          metrics: typeEvaluationMetricsSchema,
        }),
      )
      .min(2)
      .max(3),
    cases: z.array(caseSchema).min(1).max(1000),
    pairs: z.array(pairSchema).min(1).max(3),
  })
  .refine((c) => {
    const n = c.sources.length,
      total = c.cases.length,
      groups = new Set(c.cases.map((v) => v.group_digest)).size;
    return (
      new Set(c.sources.map((v) => v.report_id)).size === n &&
      new Set(c.cases.map((v) => v.task_id)).size === total &&
      new Set(c.cases.map((v) => v.gold_revision_id)).size === total &&
      c.cases.every((v) => v.scores.length === n) &&
      c.sources.every(
        (v) => v.metrics.cases === total && v.metrics.groups === groups,
      ) &&
      c.pairs.length === (n * (n - 1)) / 2 &&
      new Set(c.pairs.map((v) => `${v.baseline}/${v.candidate}`)).size ===
        c.pairs.length &&
      c.pairs.every(
        (p) =>
          p.baseline < p.candidate &&
          p.candidate < n &&
          p.metrics.cases === total &&
          p.metrics.groups === groups &&
          strata.every((stratum) => {
            const cases = c.cases.filter((v) => v.stratum === stratum);
            return (
              p.strata[stratum].cases === cases.length &&
              p.strata[stratum].groups ===
                new Set(cases.map((v) => v.group_digest)).size
            );
          }),
      )
    );
  }, "Fontes, pares ou denominadores incompatíveis.");
const documentSchema = z
  .strictObject({
    id: z.uuid(),
    source_digest: digest,
    created_at: z.string().datetime({ offset: true }),
    source_reports: refsSchema,
    comparison: comparisonSchema,
  })
  .refine(
    (d) =>
      d.source_reports.length === d.comparison.sources.length &&
      d.source_reports.every(
        (s, i) => s.report_id === d.comparison.sources[i].report_id,
      ),
    "Ordem das fontes incompatível.",
  );
export const comparisonDeliverySchema = z.strictObject({
  document: documentSchema,
  digest,
  request_id: z.uuid(),
  delivery_id: z.uuid(),
  idempotent_replay: z.boolean(),
});
export const comparisonSummarySchema = z.strictObject({
  id: z.uuid(),
  release_id: z.uuid(),
  split: z.enum(["train", "validation"]),
  source_digest: digest,
  digest,
  case_count: count.min(1).max(1000),
  source_count: count.min(2).max(3),
  created_at: z.string().datetime({ offset: true }),
});
export const comparisonMetadataSchema = z
  .strictObject({
    ...comparisonSummarySchema.shape,
    source_reports: refsSchema,
    eligible: z.boolean(),
    blockers: z.array(z.string()),
  })
  .refine(
    (m) =>
      m.source_count === m.source_reports.length &&
      m.eligible === (m.blockers.length === 0),
  );
export type ComparisonDelivery = z.infer<typeof comparisonDeliverySchema>;
export type ComparisonMetadata = z.infer<typeof comparisonMetadataSchema>;
export type ComparisonSummary = z.infer<typeof comparisonSummarySchema>;
export type ComparisonMetrics = z.infer<typeof pairMetricsSchema>;
export type ComparisonSourceRef = z.infer<typeof refSchema>;
