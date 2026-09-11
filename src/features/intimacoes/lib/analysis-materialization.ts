import type { IntimacaoDetalheView } from "../types";

export const ANALYSIS_PROCESSING_MESSAGE =
  "Análise salva; sugestões ainda em processamento";

export interface AnalysisMaterializationWindow {
  targetAnalyzedAt?: string;
  targetAnalysisId?: string;
  expectedProvidenciasCount?: number;
}

export function isAnalysisMaterializationPending(
  intimation: IntimacaoDetalheView | undefined,
  window: AnalysisMaterializationWindow,
): boolean {
  if (!intimation) return true;
  const { targetAnalyzedAt, targetAnalysisId, expectedProvidenciasCount } =
    window;

  // Quando o POST trouxe analysis_id, os IDs são a fonte de verdade. Não
  // misturar timestamp/contagem: o consumer pode deduplicar candidatas e o
  // PostgreSQL pode normalizar a precisão do timestamp.
  if (targetAnalysisId) {
    if (!intimation.ai_analysis_id || !intimation.ai_analysis_materialized_id)
      return true;
    return intimation.ai_analysis_id !== intimation.ai_analysis_materialized_id;
  }

  if (!targetAnalyzedAt) return false;

  if (intimation.ai_analyzed_at !== targetAnalyzedAt) return true;
  return (
    expectedProvidenciasCount != null &&
    expectedProvidenciasCount > 0 &&
    intimation.ai_providencias.length < expectedProvidenciasCount
  );
}

export function isAnalysisPollTimedOut(
  attempts: number,
  maxAttempts: number,
): boolean {
  return attempts >= maxAttempts;
}
