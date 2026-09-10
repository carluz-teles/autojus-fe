import { describe, expect, it } from "vitest";

import {
  ANALYSIS_PROCESSING_MESSAGE,
  isAnalysisMaterializationPending,
  isAnalysisPollTimedOut,
} from "./analysis-materialization";

function intimation(overrides: Record<string, unknown> = {}) {
  return {
    ai_analyzed_at: "2026-09-09T12:00:00Z",
    ai_analysis_id: "analysis-1",
    ai_analysis_materialized_id: "analysis-1",
    ai_providencias: [],
    ...overrides,
  } as never;
}

describe("materialização da análise por IDs", () => {
  it("encerra o poll com zero candidatas quando o mesmo analysis_id foi materializado", () => {
    expect(
      isAnalysisMaterializationPending(intimation(), {
        targetAnalyzedAt: "2026-09-09T12:00:00Z",
        targetAnalysisId: "analysis-1",
        expectedProvidenciasCount: 0,
      }),
    ).toBe(false);
  });

  it("não volta à contagem quando B=B já está materializada", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: "analysis-B",
          ai_analysis_materialized_id: "analysis-B",
          ai_providencias: [{}],
          ai_analyzed_at: "2026-09-09T12:00:00.123456Z",
        }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00.123456789Z",
          targetAnalysisId: "analysis-B",
          expectedProvidenciasCount: 2,
        },
      ),
    ).toBe(false);
  });

  it("não volta ao timestamp quando os IDs B=B estão materializados", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: "analysis-B",
          ai_analysis_materialized_id: "analysis-B",
          ai_analyzed_at: "2026-09-09T12:00:00.123456Z",
        }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00.123456789Z",
          targetAnalysisId: "analysis-B",
          expectedProvidenciasCount: 99,
        },
      ),
    ).toBe(false);
  });

  it("mantém o poll enquanto a análise salva ainda não foi materializada", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({ ai_analysis_materialized_id: null }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00Z",
          targetAnalysisId: "analysis-1",
          expectedProvidenciasCount: 0,
        },
      ),
    ).toBe(true);
  });

  it("acompanha uma análise concorrente em vez de esperar o ID antigo", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: "analysis-2",
          ai_analysis_materialized_id: null,
        }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00Z",
          targetAnalysisId: "analysis-1",
        },
      ),
    ).toBe(true);
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: "analysis-2",
          ai_analysis_materialized_id: "analysis-2",
        }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00Z",
          targetAnalysisId: "analysis-1",
        },
      ),
    ).toBe(false);
  });

  it("mantém fallback por timestamp quando IDs não estão disponíveis", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: undefined,
          ai_analysis_materialized_id: undefined,
        }),
        { targetAnalyzedAt: "2026-09-09T12:00:00Z" },
      ),
    ).toBe(false);
  });

  it("preserva fallback legado por contagem quando o POST não trouxe ID", () => {
    expect(
      isAnalysisMaterializationPending(
        intimation({
          ai_analysis_id: undefined,
          ai_analysis_materialized_id: undefined,
          ai_providencias: [{}],
        }),
        {
          targetAnalyzedAt: "2026-09-09T12:00:00Z",
          expectedProvidenciasCount: 2,
        },
      ),
    ).toBe(true);
  });

  it("distingue timeout do limite ainda não atingido e expõe a mensagem contratual", () => {
    expect(isAnalysisPollTimedOut(5, 6)).toBe(false);
    expect(isAnalysisPollTimedOut(6, 6)).toBe(true);
    expect(ANALYSIS_PROCESSING_MESSAGE).toBe(
      "Análise salva; sugestões ainda em processamento",
    );
  });
});
