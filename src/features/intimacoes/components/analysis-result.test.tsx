import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { analysisResult } from "../services/analysis-result";
import { AnalysisResult } from "./analysis-result";

vi.mock("@/features/ai-feedback/components/ai-feedback", () => ({
  AiFeedback: ({
    resultId,
    question,
  }: {
    resultId: string;
    question: string;
  }) => <span data-feedback={resultId}>{question}</span>,
}));
describe("original analysis presentation", () => {
  it("renders the preserved narrative and exact feedback identity as literal text", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const result = analysisResult({
      analysis_id: id,
      ai_result_id: id,
      result_origin: "ai_with_rules",
      ato: "Manifestação",
      analyzed_at: "2026-10-01T12:00:00Z",
      contexto: {
        situacao: "<script>alert(1)</script>",
        o_que_aconteceu: "Vista dos autos",
        o_que_se_espera: "Conferir documentos",
        fundamentos: [],
      },
      providencias: [],
    });
    const html = renderToStaticMarkup(<AnalysisResult result={result} />);
    expect(html).toContain(`data-feedback="${id}"`);
    expect(html).toContain("Esta análise foi útil?");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
  it("does not render a CTA without a preserved result", () => {
    expect(renderToStaticMarkup(<AnalysisResult result={null} />)).toBe("");
  });
});
