"use client";
import { EvaluationTelemetryView } from "./evaluation-telemetry";
export { EvaluationTelemetryView } from "./evaluation-telemetry";
import {
  evaluationCounts,
  evaluationDimensions,
} from "../services/evaluation-presentation";
import type {
  EvaluationDelivery,
  EvaluationMetrics,
} from "../services/evaluation-schemas";
import { EvaluationTypeReportView } from "./evaluation-type-report";

export function EvaluationMetricsView({
  metrics: m,
}: {
  metrics: EvaluationMetrics;
}) {
  return (
    <div className="space-y-4">
      <p>
        {m.cases} casos · {m.groups} grupos · {m.all_scored_dimensions_correct}{" "}
        casos com todas as dimensões pontuadas corretas
      </p>
      <p>
        {m.cases_with_critical_candidate} casos com possíveis erros críticos;
        dependem de revisão jurídica.
      </p>
      <p>
        Abstenções totais apropriadas: {m.appropriate_total_abstentions} /{" "}
        {m.expected_total_abstentions} esperadas.
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {evaluationCounts(m.outcomes).map((row) => (
          <li key={row.code}>
            {row.label}: {row.count}
          </li>
        ))}
      </ul>
      <div
        className="overflow-x-auto rounded-lg border"
        role="region"
        aria-label="Métricas por dimensão"
        tabIndex={0}
      >
        <table className="w-full text-left text-sm">
          <caption className="p-3 text-left">
            Contagens por dimensão. Alvos conhecidos = acertos + erros +
            abstenções + indisponíveis + sem correspondência.
          </caption>
          <thead className="bg-muted">
            <tr>
              <th className="p-3" scope="col">
                Dimensão
              </th>
              <th className="p-3" scope="col">
                Alvos conhecidos
              </th>
              <th className="p-3" scope="col">
                Acertos
              </th>
              <th className="p-3" scope="col">
                Erros
              </th>
              <th className="p-3" scope="col">
                Abstenções
              </th>
              <th className="p-3" scope="col">
                Indisponíveis
              </th>
              <th className="p-3" scope="col">
                Sem correspondência
              </th>
              <th className="p-3" scope="col">
                Alvos desconhecidos
              </th>
              <th className="p-3" scope="col">
                Abstenções apropriadas
              </th>
              <th className="p-3" scope="col">
                Afirmações sem suporte
              </th>
              <th className="p-3" scope="col">
                Não aplicáveis
              </th>
            </tr>
          </thead>
          <tbody>
            {evaluationDimensions(m).map((row) => (
              <tr className="border-t" key={row.code}>
                <th className="p-3" scope="row">
                  {row.label}
                </th>
                <td className="p-3">{row.known_targets}</td>
                <td className="p-3">{row.correct}</td>
                <td className="p-3">{row.incorrect}</td>
                <td className="p-3">{row.abstained}</td>
                <td className="p-3">{row.unavailable}</td>
                <td className="p-3">{row.unmatched}</td>
                <td className="p-3">{row.unknown_targets}</td>
                <td className="p-3">{row.appropriate_abstentions}</td>
                <td className="p-3">{row.unsupported}</td>
                <td className="p-3">{row.not_applicable}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <EvaluationTelemetryView telemetry={m.telemetry} />
      <details>
        <summary className="cursor-pointer text-sm">
          Indicadores de possíveis erros críticos
        </summary>
        <ul>
          {evaluationCounts(m.critical_candidates).map((row) => (
            <li className="break-all" key={row.code}>
              {row.label}: {row.count}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
export function EvaluationReportView({
  delivery: d,
}: {
  delivery: EvaluationDelivery;
}) {
  const r = d.report;
  if (r.schema_version === "intimation-type-run-report-v1")
    return <EvaluationTypeReportView report={r} delivery={d} />;
  const e = r.evaluation;
  return (
    <section
      className="min-w-0 space-y-5 rounded-lg border p-5"
      aria-label="Relatório emitido"
    >
      <h2 className="font-display text-2xl">Relatório de avaliação</h2>
      <p>
        {e.origin === "synthetic"
          ? "Dados sintéticos — validação de engenharia"
          : "Dados reais"}{" "}
        · Gerado em {r.generated_at}
      </p>
      <p className="text-muted-foreground text-sm">
        Métricas descritivas sem ponderação amostral. A conclusão do
        processamento não aprova o modelo para produção. Falhas e resultados
        incertos permanecem nos denominadores.
      </p>
      <EvaluationMetricsView metrics={e.metrics} />
      <details>
        <summary className="cursor-pointer font-medium">
          Resultados por estrato
        </summary>
        <div className="mt-4 space-y-6">
          {Object.entries(e.strata).map(([stratum, metrics]) => (
            <section key={stratum} className="space-y-3">
              <h3 className="font-medium">{stratum}</h3>
              <EvaluationMetricsView metrics={metrics} />
            </section>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">
          Qualidade e falhas do conjunto
        </summary>
        <div className="mt-3 space-y-3">
          <p>Qualidade das revisões:</p>
          <ul>
            {evaluationCounts(e.qualities).map((row) => (
              <li key={row.code}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
          <p>Falhas registradas:</p>
          <ul>
            {evaluationCounts(r.failure_codes).map((row) => (
              <li className="break-all" key={row.code}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">
          Conferir casos e probabilidades de inclusão
        </summary>
        <div className="mt-3 divide-y">
          {e.samples.map((sample) => (
            <article className="space-y-2 py-3 text-sm" key={sample.id}>
              <p className="break-all">Gold {sample.id}</p>
              <p>
                {sample.stratum} · {sample.quality} · Probabilidade{" "}
                {sample.inclusion_numerator}/{sample.inclusion_denominator}
              </p>
              <p>
                Resultado: {sample.evaluation.outcome} · Atos correspondentes:{" "}
                {sample.evaluation.matched_acts}/{sample.evaluation.gold_acts}
              </p>
              <p className="break-all">Grupo: {sample.group_digest}</p>
            </article>
          ))}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm">
          Recibo e linhagem do relatório
        </summary>
        <div className="mt-3 space-y-1 text-xs break-all">
          <p>Relatório: {r.id}</p>
          <p>Emissão: {d.delivery_id}</p>
          <p>SHA256: {d.digest}</p>
          <p>Registros selecionados: {r.selected_records_digest}</p>
          <p>Manifesto: {r.source_manifest_digest}</p>
          <p>Definição: {r.definition_digest}</p>
          <p>Modelo: {e.pipeline.model}</p>
          <p>Avaliador: {e.policy_version}</p>
        </div>
      </details>
      <p className="text-muted-foreground text-sm">
        Este relatório é imutável. Recibos tardios podem atualizar o consumo da
        execução, mas não alteram as métricas ou o custo registrados acima.
      </p>
    </section>
  );
}
