"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type {
  ComparisonDelivery,
  ComparisonMetrics,
} from "../services/comparison-schemas";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import { samplingStrata, splitLabels } from "../services/sampling";
import { EvaluationTelemetryView } from "./evaluation-telemetry";

const outcomeLabels: Record<string, string> = {
  correct: "Acerto",
  wrong: "Erro",
  abstained: "Abstenção em alvo conhecido",
  appropriate_abstention: "Abstenção apropriada",
  unsupported: "Classificação sem suporte",
  unavailable: "Indisponível",
};
export function PairMetrics({ metrics: m }: { metrics: ComparisonMetrics }) {
  if (!m.cases)
    return <p className="text-muted-foreground">Sem casos neste estrato.</p>;
  const rows = [
    ["Casos / grupos", `${m.cases} / ${m.groups}`],
    ["Ganhos", m.improved],
    ["Regressões", m.regressed],
    ["Ambos aceitáveis", m.both_acceptable],
    ["Nenhum aceitável", m.neither_acceptable],
    [
      "Indisponíveis na referência / comparação",
      `${m.baseline_unavailable} / ${m.candidate_unavailable}`,
    ],
  ] as const;
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <details>
        <summary className="cursor-pointer text-sm">
          Transições entre resultados
        </summary>
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {Object.entries(m.transitions).map(([key, count]) => {
            const [left, right] = key.split("/");
            return (
              <li key={key}>
                {outcomeLabels[left] ?? left} → {outcomeLabels[right] ?? right}:{" "}
                {count}
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
export function ComparisonReport({
  delivery: d,
}: {
  delivery: ComparisonDelivery;
}) {
  const c = d.document.comparison;
  return (
    <section
      aria-label="Comparação emitida"
      className="flex min-w-0 flex-col gap-6"
    >
      <header className="flex flex-col gap-2">
        <h2 className="font-display text-2xl">Resultados pareados</h2>
        <p>
          {c.origin === "synthetic"
            ? "Dados sintéticos — validação de engenharia"
            : "Dados reais"}{" "}
          · {splitLabels[c.split]} · {c.cases.length} casos
        </p>
        <p className="text-muted-foreground text-sm">
          A comparação mede somente tipo do ato. Aceitável significa acerto de
          tipo ou abstenção apropriada para o alvo; não representa aprovação
          jurídica.
        </p>
      </header>
      {c.split === "validation" ? (
        <a
          className="text-sm underline"
          href={`/backoffice/comparisons/${d.document.id}/candidate`}
        >
          Selecionar candidato nesta validação
        </a>
      ) : null}
      <Alert role="note">
        <AlertDescription>
          Ganhos, regressões, ambos aceitáveis e nenhum aceitável somam todos os
          casos, incluindo falhas. As contagens são descritivas, sem ponderação
          amostral ou aprovação automática de um modelo para produção.
        </AlertDescription>
      </Alert>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {c.pairs.map((pair) => (
          <Card key={`${pair.baseline}/${pair.candidate}`}>
            <CardHeader>
              <CardTitle>
                <h3>
                  Fonte {pair.baseline + 1} → Fonte {pair.candidate + 1}
                </h3>
              </CardTitle>
              <CardDescription>
                A segunda fonte é comparada à primeira.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <PairMetrics metrics={pair.metrics} />
              <details>
                <summary className="cursor-pointer font-medium">
                  Resultados por estrato
                </summary>
                <div className="mt-4 flex flex-col gap-5">
                  {samplingStrata.map(({ value, label }) => (
                    <section key={value} className="flex flex-col gap-2">
                      <h4 className="font-medium">{label}</h4>
                      <PairMetrics metrics={pair.strata[value]} />
                    </section>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>
      <section aria-label="Fontes e consumo" className="flex flex-col gap-4">
        <h3 className="font-display text-2xl">Fontes e consumo registrado</h3>
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {c.sources.map((source, i) => (
            <Card key={source.report_id}>
              <CardHeader>
                <CardTitle>
                  <h4>Fonte {i + 1}</h4>
                </CardTitle>
                <CardDescription>
                  {evaluationPipelineLabels[source.pipeline.id]}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="break-words">
                  {source.pipeline.model || "Sem modelo de IA"}
                </p>
                <p>
                  {source.metrics.cases} casos · {source.metrics.groups} grupos
                </p>
                <EvaluationTelemetryView telemetry={source.metrics.telemetry} />
                <a
                  className="underline"
                  href={`/backoffice/evaluations/${source.plan_id}`}
                >
                  Consultar avaliação da fonte {i + 1}
                </a>
                <details>
                  <summary className="cursor-pointer">Versões da fonte</summary>
                  <div className="mt-2 flex flex-col gap-1 text-xs break-all">
                    <p>Relatório: {source.report_id}</p>
                    <p>Configuração: {source.pipeline.configuration_digest}</p>
                    <p>Prompt: {source.pipeline.prompt_version}</p>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-muted-foreground text-sm">
          O consumo pertence às execuções originais. Comparar não faz novas
          chamadas de IA. Um recibo tardio não altera o custo congelado neste
          documento.
        </p>
      </section>
      <details>
        <summary className="cursor-pointer font-medium">
          Conferir casos e amostragem
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          {c.cases.map((item, i) => (
            <article key={item.task_id} className="flex flex-col gap-2 text-sm">
              <h3 className="font-medium">Caso {i + 1}</h3>
              <p>
                {samplingStrata.find((s) => s.value === item.stratum)?.label} ·{" "}
                {item.quality} · Probabilidade {item.inclusion_numerator}/
                {item.inclusion_denominator}
              </p>
              {item.scores.map((score, j) => (
                <p key={j}>
                  Fonte {j + 1}:{" "}
                  {score.prediction
                    ? score.resolved
                      ? score.prediction.act_type
                      : "Abstenção ou revisão necessária"
                    : "Indisponível"}
                  {score.appropriate_abstention
                    ? " · Abstenção apropriada"
                    : ""}
                </p>
              ))}
              <details>
                <summary className="cursor-pointer">
                  Alvo e identificação do caso {i + 1}
                </summary>
                <div className="mt-2 flex flex-col gap-1 break-all">
                  <p>
                    Alvo:{" "}
                    {"act_type" in item.scores[0].target
                      ? item.scores[0].target.act_type
                      : `Abstenção esperada: ${item.scores[0].target.abstention_reason}`}
                  </p>
                  <p>Grupo: {item.group_digest}</p>
                  <p>Gold: {item.gold_revision_id}</p>
                  <p>Entrada: {item.input_digest}</p>
                </div>
              </details>
            </article>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm">
          Recibo e linhagem da comparação
        </summary>
        <div className="mt-3 flex flex-col gap-1 text-xs break-all">
          <p>Comparação: {d.document.id}</p>
          <p>Emissão: {d.delivery_id}</p>
          <p>Pedido: {d.request_id}</p>
          <p>SHA256: {d.digest}</p>
          <p>Manifesto: {c.source_manifest_digest}</p>
          <p>Registros: {c.selected_records_digest}</p>
          <p>Fontes: {d.document.source_digest}</p>
        </div>
      </details>
      <a
        href={`/backoffice/comparisons/${d.document.id}`}
        className="w-fit text-sm underline"
      >
        Consultar esta comparação no histórico
      </a>
    </section>
  );
}
