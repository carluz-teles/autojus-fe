import { z } from "zod";
const count = z.int().nonnegative();
const decimal = z
  .string()
  .max(80)
  .regex(/^\d+(\.\d+)?$/);
export const evaluationTelemetrySchema = z.strictObject({
  known_cost_cases: count,
  unknown_cost_cases: count,
  observed_cost_usd: decimal,
  total_cost_usd: decimal.nullable(),
  known_latency_cases: count,
  unknown_latency_cases: count,
  latency_ms_sum: count,
  known_call_cases: count,
  unknown_call_cases: count,
  observed_http_calls: count,
});
export const evaluationDimensionSchema = z
  .strictObject({
    known_targets: count,
    correct: count,
    incorrect: count,
    abstained: count,
    unavailable: count,
    unmatched: count,
    unknown_targets: count,
    appropriate_abstentions: count,
    unsupported: count,
    not_applicable: count,
  })
  .refine(
    (d) =>
      d.known_targets ===
      d.correct + d.incorrect + d.abstained + d.unavailable + d.unmatched,
    "Denominador incompatível.",
  );
