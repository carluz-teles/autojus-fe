import { expect, it } from "vitest";

import { evaluationFixture } from "../__tests__/evaluation-fixture";
import { evaluationPreviewSchema } from "./evaluation-schemas";
import { sameEvaluationSelection } from "./evaluations";

it("accepts a local TYPE plan with zero calls and refuses mixing evaluation contracts", () => {
  const { preview } = evaluationFixture();
  const { route: _route, ...base } = preview;
  const typePreview = {
    ...base,
    selection: {
      ...base.selection,
      pipeline: "deterministic",
      limits: {
        ...base.selection.limits,
        max_http_calls: 0,
        max_output_tokens: 0,
      },
    },
    type_route: {
      version: "deadline-type-pipeline-v1",
      mode: "deterministic",
      policy_version: "",
      policy: null,
      endpoint: "",
    },
    evaluator_version: "type-projection-v1",
    planned_http_calls: 0,
    planned_output_tokens: 0,
  };
  expect(evaluationPreviewSchema.parse(typePreview)).toEqual(typePreview);
  expect(
    evaluationPreviewSchema.safeParse({ ...typePreview, route: preview.route })
      .success,
  ).toBe(false);
  expect(
    evaluationPreviewSchema.safeParse({ ...typePreview, planned_http_calls: 1 })
      .success,
  ).toBe(false);
  expect(
    evaluationPreviewSchema.safeParse({
      ...typePreview,
      evaluator_version: "intimation-dimensions-v1",
    }).success,
  ).toBe(false);
  expect(
    sameEvaluationSelection(typePreview.selection, preview.selection),
  ).toBe(false);
  expect(
    sameEvaluationSelection(typePreview.selection, {
      ...typePreview.selection,
      pipeline: "current",
    }),
  ).toBe(false);
});

it("counts only fallback calls without dropping locally resolved TYPE cases", () => {
  const { preview } = evaluationFixture();
  const { route: _route, ...base } = preview;
  const input = {
    ...base,
    case_count: 3,
    planned_http_calls: 1,
    planned_output_tokens: 800,
    evaluator_version: "type-projection-v1",
    selection: {
      ...base.selection,
      pipeline: "current",
      limits: {
        max_cases: 3,
        max_http_calls: 1,
        max_output_tokens: 800,
        concurrency: 1,
      },
    },
    type_route: {
      version: "deadline-type-pipeline-v1",
      mode: "current",
      policy_version: "synthetic-v1",
      endpoint: "http://127.0.0.1:1",
      policy: {
        model: "synthetic/model",
        max_tokens: 800,
        reasoning_tokens: 0,
        timeout_seconds: 30,
      },
    },
  };
  expect(evaluationPreviewSchema.safeParse(input).success).toBe(true);
  expect(
    evaluationPreviewSchema.safeParse({ ...input, planned_output_tokens: 799 })
      .success,
  ).toBe(false);
  expect(
    evaluationPreviewSchema.safeParse({
      ...input,
      type_route: { ...input.type_route, mode: "abstention-v1" },
    }).success,
  ).toBe(false);
});
