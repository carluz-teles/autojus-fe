import { z } from "zod";

import { typeRouteSchema } from "./evaluation-schemas";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
const rate = z.int().min(0).max(10000);
export const candidateRuleSchema = z
  .strictObject({
    min_cases: z.int().min(1).max(1000),
    min_groups: z.int().min(1).max(1000),
    min_acceptable_bps: rate,
    max_critical_bps: rate,
    max_unavailable_bps: rate,
    max_regression_bps: rate,
  })
  .refine(
    (r) => r.min_groups <= r.min_cases,
    "O mínimo de grupos não pode exceder o mínimo de casos.",
  );
export const candidatePolicySchema = z.strictObject({
  version: z.literal("type-candidate-criteria-v1"),
  overall: candidateRuleSchema,
  strata: z.strictObject({
    resolved: candidateRuleSchema.nullable(),
    residual: candidateRuleSchema.nullable(),
    rare: candidateRuleSchema.nullable(),
    insufficient_context: candidateRuleSchema.nullable(),
  }),
});
export const candidateDocumentSchema = z
  .strictObject({
    schema_version: z.literal("type-evaluation-candidate-v1"),
    id: z.uuid(),
    release_id: z.uuid(),
    origin: z.enum(["real", "synthetic"]),
    comparison_id: z.uuid(),
    comparison_digest: digest,
    baseline_report_id: z.uuid(),
    candidate_report_id: z.uuid(),
    candidate_report_digest: digest,
    plan_id: z.uuid(),
    definition_digest: digest,
    route_digest: digest,
    route: typeRouteSchema,
    policy: candidatePolicySchema,
    reason: z
      .string()
      .min(1)
      .max(4000)
      .refine(
        (s) =>
          !!s.trim() &&
          !s.includes("\0") &&
          new TextEncoder().encode(s).byteLength <= 4000,
      ),
    frozen_at: z.iso.datetime({ offset: true }),
  })
  .refine(
    (d) => d.baseline_report_id !== d.candidate_report_id,
    "As fontes devem ser distintas.",
  );
export const candidateViewSchema = z
  .strictObject({
    document: candidateDocumentSchema,
    digest,
    request_id: z.uuid(),
    eligible: z.boolean(),
    blockers: z.array(z.string()),
    idempotent_replay: z.boolean(),
    closed_test_available: z.boolean(),
    production_approved: z.literal(false),
  })
  .refine(
    (v) => v.eligible === (v.blockers.length === 0),
    "Elegibilidade incompatível.",
  );
export const candidateSummarySchema = z.strictObject({
  id: z.uuid(),
  release_id: z.uuid(),
  comparison_id: z.uuid(),
  plan_id: z.uuid(),
  digest,
  frozen_at: z.iso.datetime({ offset: true }),
});
export type CandidateRule = z.infer<typeof candidateRuleSchema>;
export type CandidatePolicy = z.infer<typeof candidatePolicySchema>;
export type CandidateView = z.infer<typeof candidateViewSchema>;
export type CandidateDocument = z.infer<typeof candidateDocumentSchema>;
export type CandidateStratum = keyof CandidatePolicy["strata"];
