import { describe, expect, it } from "vitest";

import { analysisResult } from "./analysis-result";

const id = "11111111-1111-4111-8111-111111111111";
const result = {
  analysis_id: id,
  ai_result_id: id,
  result_origin: "ai_with_rules",
  ato: "Manifestação",
  analyzed_at: "2026-10-01T12:00:00Z",
  contexto: null,
  providencias: [],
};
describe("original intimation analysis for feedback", () => {
  it("preserves the exact result and literal text", () => {
    expect(
      analysisResult({ ...result, ato: "<script>texto</script>" }),
    ).toMatchObject({ ai_result_id: id, ato: "<script>texto</script>" });
  });
  it.each([
    undefined,
    null,
    {},
    { ...result, ai_result_id: undefined },
    { ...result, result_origin: "rule" },
    { ...result, analysis_id: "22222222-2222-4222-8222-222222222222" },
  ])(
    "does not offer feedback for a legacy, rule or mismatched result",
    (value) => {
      expect(analysisResult(value)).toBeNull();
    },
  );
});
