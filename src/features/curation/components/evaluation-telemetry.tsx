"use client";
import { evaluationTelemetryRows } from "../services/evaluation-presentation";
import type { EvaluationTelemetry } from "../services/evaluation-schemas";
export function EvaluationTelemetryView({
  telemetry,
  unit = "Casos",
}: {
  telemetry: EvaluationTelemetry;
  unit?: "Casos" | "Etapas";
}) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {evaluationTelemetryRows(telemetry, unit).map((row) => (
        <div key={row.label}>
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
