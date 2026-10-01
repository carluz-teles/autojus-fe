"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ClosedPreview } from "../services/closed-test-schemas";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import { CandidatePolicyView } from "./candidate-criteria";

export function ClosedTestPreviewView({
  preview: p,
}: {
  preview: ClosedPreview;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>Conjunto e limites conferidos</h3>
        </CardTitle>
        <CardDescription>
          {p.origin === "synthetic"
            ? "Dados sintéticos — validação de engenharia"
            : "Dados reais"}
          . Todos os casos elegíveis do conjunto reservado entram no teste.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-sm">Casos pareados</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {p.case_count}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              Grupos independentes
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {p.group_count}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              Chamadas previstas
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {p.planned_http_calls}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-sm">
              Tokens de saída previstos
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {p.planned_output_tokens}
            </dd>
          </div>
        </dl>
        <p className="text-sm">
          Limites conjuntos: até {p.selection.limits.max_http_calls} chamadas e{" "}
          {p.selection.limits.max_output_tokens} tokens de saída, uma etapa por
          vez. Estes limites não são uma cotação em dinheiro.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["baseline", "candidate"] as const).map((role) => (
            <section key={role} className="min-w-0 rounded-md border p-4">
              <h4 className="font-medium">
                {role === "baseline" ? "Referência" : "Candidato"}
              </h4>
              <p className="text-sm">
                {evaluationPipelineLabels[p[role].route.mode]}
              </p>
              <p className="text-muted-foreground mt-2 text-sm break-words">
                {p[role].route.policy?.model ?? "Processamento local"}
              </p>
            </section>
          ))}
        </div>
        <p className="text-sm break-words whitespace-pre-wrap">
          Justificativa: {p.selection.reason}
        </p>
        <details>
          <summary className="cursor-pointer text-sm">
            Critérios congelados na validação
          </summary>
          <div className="mt-4">
            <CandidatePolicyView policy={p.policy} />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
