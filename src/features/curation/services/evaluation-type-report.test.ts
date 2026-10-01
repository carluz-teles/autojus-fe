import { expect, it } from "vitest";

import { typeEvaluationFixture } from "../__tests__/evaluation-fixture";
import { evaluationDeliverySchema } from "./evaluation-schemas";

it("accepts only the distinct TYPE report contract and its matching denominator", () => {
  const f = typeEvaluationFixture();
  expect(evaluationDeliverySchema.parse(f.delivery)).toEqual(f.delivery);
  const mixed = structuredClone(f.delivery);
  Object.assign(mixed.report, { evaluation: {} });
  expect(evaluationDeliverySchema.safeParse(mixed).success).toBe(false);
  const bad = structuredClone(f.delivery);
  bad.report.type_evaluation.metrics.type.known_targets = 1;
  expect(evaluationDeliverySchema.safeParse(bad).success).toBe(false);
  const foreign = structuredClone(f.delivery);
  foreign.report.type_evaluation.samples[0].id = f.ids.plan;
  expect(evaluationDeliverySchema.safeParse(foreign).success).toBe(false);
});

it("rejects technical failure presented as an appropriate abstention", () => {
  const f = typeEvaluationFixture();
  const score = f.delivery.report.type_evaluation.samples[0].evaluation;
  Object.assign(score, { outcome: "failed", prediction: null });
  expect(evaluationDeliverySchema.safeParse(f.delivery).success).toBe(false);
});
