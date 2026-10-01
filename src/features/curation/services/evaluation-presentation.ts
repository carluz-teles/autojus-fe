import type {
  EvaluationMetrics,
  EvaluationRun,
  EvaluationTelemetry,
} from "./evaluation-schemas";
import { evaluationStateLabels } from "./evaluations";

const dimensionLabels: Record<string, string> = {
  act_type: "Tipo do ato",
  recipient: "Destinatário",
  actionability: "Acionabilidade",
  answerability: "Possibilidade de responder",
  missing_context: "Contexto faltante",
  deadline_kind: "Natureza do prazo",
  quantity: "Quantidade",
  unit: "Unidade",
  anchor_event: "Marco inicial",
  start_rule: "Regra de início",
  anchor_date: "Data de referência",
  due_date: "Vencimento",
  date_status: "Estado da data",
  legal_rule: "Regra jurídica",
  calendar: "Calendário",
  event: "Evento",
  condition: "Condição",
  act_evidence: "Evidência do ato",
  deadline_evidence: "Evidência do prazo",
};
export function evaluationCounts(values: Record<string, number>) {
  return Object.entries(values).map(([code, count]) => ({
    code,
    label: evaluationStateLabels[code] ?? code,
    count,
  }));
}
export function evaluationDimensions(metrics: EvaluationMetrics) {
  return Object.entries(metrics.dimensions).map(([code, counts]) => ({
    code,
    label: dimensionLabels[code] ?? code,
    ...counts,
  }));
}
export function evaluationTelemetryRows(
  t: EvaluationTelemetry,
  unit: "Casos" | "Etapas" = "Casos",
) {
  return [
    {
      label: "Custo total observado (USD)",
      value: t.total_cost_usd ?? "Desconhecido",
    },
    { label: "Subtotal conhecido (USD)", value: t.observed_cost_usd },
    {
      label: `${unit} com custo conhecido / desconhecido`,
      value: `${t.known_cost_cases} / ${t.unknown_cost_cases}`,
    },
    { label: "Chamadas HTTP observadas", value: String(t.observed_http_calls) },
    {
      label: `${unit} com chamadas conhecidas / desconhecidas`,
      value: `${t.known_call_cases} / ${t.unknown_call_cases}`,
    },
    {
      label: "Soma de latência conhecida (ms)",
      value: String(t.latency_ms_sum),
    },
    {
      label: `${unit} com latência conhecida / desconhecida`,
      value: `${t.known_latency_cases} / ${t.unknown_latency_cases}`,
    },
  ];
}
export function evaluationRunCounts(run: EvaluationRun) {
  return evaluationCounts(run.case_counts);
}

export const evaluationPipelineLabels: Record<string, string> = {
  "": "Anotação completa",
  deterministic: "A · Tipo pelo motor determinístico",
  current: "B · Tipo pelo fluxo comercial atual",
  "abstention-v1": "C · Tipo com instrução experimental de abstenção",
};
