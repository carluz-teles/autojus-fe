"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { ClosedDelivery } from "../services/closed-test-schemas";
import { evaluationStateLabels } from "../services/evaluations";
import { CandidatePolicyView } from "./candidate-criteria";
import { PairMetrics } from "./comparison-report";
import { TypeMetrics } from "./evaluation-type-report";

const conclusionLabels = {
  passed: "Critérios atingidos",
  failed: "Critérios não atingidos",
  insufficient: "Evidência insuficiente",
  incomplete_execution: "Execução incompleta",
};
const groupLabels = {
  resolved: "Resolvidos",
  residual: "Residuais",
  rare: "Raros",
  insufficient_context: "Contexto insuficiente",
};
export function ClosedTestReportView({
  delivery: d,
}: {
  delivery: ClosedDelivery;
}) {
  const r = d.report;
  return (
    <section
      aria-label="Relatório do teste fechado"
      className="flex min-w-0 flex-col gap-5"
    >
      <Alert>
        <AlertTitle>{conclusionLabels[r.conclusion]}</AlertTitle>
        <AlertDescription>
          {r.origin === "synthetic"
            ? "Evidência sintética para validar a ferramenta. "
            : ""}
          Este relatório avalia somente o tipo do ato. Prazos e calendário
          exigem avaliações próprias. A decisão não ativa um modelo em produção.
        </AlertDescription>
      </Alert>
      <p className="text-sm">
        Execução: {evaluationStateLabels[r.run_state]}. Critérios descritivos:{" "}
        {conclusionLabels[r.assessment.status]}. Falhas permanecem no
        denominador.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>
            <h3>Comparação no conjunto reservado</h3>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PairMetrics metrics={r.pair.metrics} />
        </CardContent>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        {(["baseline", "candidate"] as const).map((role) => (
          <Card key={role}>
            <CardHeader>
              <CardTitle>
                <h3>{role === "baseline" ? "Referência" : "Candidato"}</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
              <TypeMetrics metrics={r[`${role}_metrics`]} />
            </CardContent>
          </Card>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer font-medium">
          Estratos e critérios
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          <CandidatePolicyView policy={r.policy} />
          {Object.entries(r.pair.strata).map(([key, metrics]) => (
            <section key={key}>
              <h4 className="font-medium">
                {groupLabels[key as keyof typeof groupLabels]}
              </h4>
              <PairMetrics metrics={metrics} />
            </section>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">
          Casos, etapas e recibos ({r.cases.length} casos)
        </summary>
        <div className="mt-4 flex flex-col gap-4">
          {r.cases.map((c) => (
            <section className="min-w-0 rounded-md border p-4" key={c.task_id}>
              <h4 className="font-medium break-all">Caso {c.task_id}</h4>
              <p className="text-sm">
                {groupLabels[c.stratum]} · {c.quality} · Probabilidade de
                inclusão: {c.inclusion_numerator}/{c.inclusion_denominator}
              </p>
              {c.scores.map((score, i) => (
                <p key={i} className="mt-2 text-sm break-words">
                  {i === 0 ? "Referência" : "Candidato"}:{" "}
                  {evaluationStateLabels[score.outcome] ?? score.outcome} ·{" "}
                  {score.prediction?.act_type ?? "Sem previsão disponível"}
                  {score.appropriate_abstention
                    ? " · Abstenção apropriada"
                    : ""}
                </p>
              ))}
            </section>
          ))}
          <pre className="max-w-full overflow-x-auto text-xs">
            {JSON.stringify(
              { stages: r.stages, failure_codes: r.failure_codes },
              null,
              2,
            )}
          </pre>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm">
          Auditoria desta emissão
        </summary>
        <pre className="mt-3 max-w-full overflow-x-auto text-xs">
          {JSON.stringify(
            {
              report: r.id,
              run: r.run_id,
              reservation: r.reservation_id,
              digest: d.digest,
              delivery: d.delivery_id,
              request: d.request_id,
              generated_at: r.generated_at,
              reserved_http_calls: r.reserved_http_calls,
              reserved_output_tokens: r.reserved_output_tokens,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
