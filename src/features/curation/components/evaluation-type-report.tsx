"use client";

import {
  evaluationCounts,
  evaluationPipelineLabels,
} from "../services/evaluation-presentation";
import type { EvaluationDelivery } from "../services/evaluation-schemas";
import type { TypeEvaluationMetrics } from "../services/evaluation-type-schemas";
import { EvaluationTelemetryView } from "./evaluation-telemetry";

type TypeReport = Extract<
  EvaluationDelivery["report"],
  { schema_version: "intimation-type-run-report-v1" }
>;
const abstentionLabels: Record<string, string> = {
  insufficient_context: "Contexto insuficiente",
  multiple_acts: "Mais de um ato",
  unresolved_type: "Tipo ou destinatário não resolvido",
  non_client_recipient: "Ato dirigido a outro destinatário",
};
export function TypeMetrics({
  metrics: m,
}: {
  metrics: TypeEvaluationMetrics;
}) {
  const rows = [
    ["Casos / grupos", `${m.cases} / ${m.groups}`],
    ["Alvos conhecidos", m.type.known_targets],
    ["Acertos", m.type.correct],
    ["Erros", m.type.incorrect],
    ["Abstenções em alvos conhecidos", m.type.abstained],
    ["Resultados indisponíveis em alvos conhecidos", m.type.unavailable],
    [
      "Abstenções apropriadas / esperadas",
      `${m.appropriate_abstentions} / ${m.expected_abstentions}`,
    ],
    ["Classificações sem suporte no alvo", m.type.unsupported],
  ] as const;
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {evaluationCounts(m.outcomes).map((row) => (
          <li key={row.code}>
            {row.label}: {row.count}
          </li>
        ))}
      </ul>
      <EvaluationTelemetryView telemetry={m.telemetry} />
      <p className="text-muted-foreground text-sm">
        Alvos conhecidos = acertos + erros + abstenções + indisponíveis. Falhas
        não contam como abstenções apropriadas.
      </p>
    </div>
  );
}
export function EvaluationTypeReportView({
  report: r,
  delivery,
}: {
  report: TypeReport;
  delivery: EvaluationDelivery;
}) {
  const e = r.type_evaluation;
  return (
    <section
      className="min-w-0 space-y-5 rounded-lg border p-5"
      aria-label="Relatório emitido"
    >
      <h2 className="font-display text-2xl">Relatório de tipo do ato</h2>
      <p>{evaluationPipelineLabels[e.pipeline.id]}</p>
      <p>
        {e.origin === "synthetic"
          ? "Dados sintéticos — validação de engenharia"
          : "Dados reais"}{" "}
        · Gerado em {r.generated_at}
      </p>
      <p className="text-muted-foreground text-sm">
        Esta avaliação mede somente a projeção de tipo do ato. Prazo,
        destinatário, acionabilidade e calendário exigem avaliações próprias. As
        métricas são descritivas, sem ponderação amostral, e não aprovam uso em
        produção.
      </p>
      <TypeMetrics metrics={e.metrics} />
      <details>
        <summary className="cursor-pointer font-medium">
          Resultados por estrato
        </summary>
        <div className="mt-4 space-y-6">
          {Object.entries(e.strata).map(([stratum, metrics]) => (
            <section key={stratum} className="space-y-3">
              <h3 className="font-medium">{stratum}</h3>
              <TypeMetrics metrics={metrics} />
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
              <li key={row.code}>
                {row.label}: {row.count}
              </li>
            ))}
          </ul>
          <p>Possíveis erros críticos, sujeitos a revisão jurídica:</p>
          <ul>
            {Object.entries(e.metrics.critical_candidates).map(
              ([code, count]) => (
                <li key={code}>
                  {code === "wrong_resolved_type"
                    ? "Tipo divergente do gabarito"
                    : "Classificação sem suporte no alvo"}
                  : {count}
                </li>
              ),
            )}
          </ul>
        </div>
      </details>
      <details>
        <summary className="cursor-pointer font-medium">
          Conferir casos e probabilidades de inclusão
        </summary>
        <div className="mt-3 divide-y">
          {e.samples.map((sample) => {
            const s = sample.evaluation;
            return (
              <article className="space-y-2 py-3 text-sm" key={sample.id}>
                <p className="break-all">Gold {sample.id}</p>
                <p>
                  {sample.stratum} · {sample.quality} · Probabilidade{" "}
                  {sample.inclusion_numerator}/{sample.inclusion_denominator}
                </p>
                <p>
                  Alvo:{" "}
                  {"act_type" in s.target
                    ? s.target.act_type
                    : abstentionLabels[s.target.abstention_reason]}
                </p>
                <p>
                  Resultado:{" "}
                  {s.prediction
                    ? s.resolved
                      ? s.prediction.act_type
                      : "Abstenção ou revisão necessária"
                    : "Indisponível"}
                </p>
                <p className="break-all">Grupo: {sample.group_digest}</p>
              </article>
            );
          })}
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm">
          Recibo e linhagem do relatório
        </summary>
        <div className="mt-3 space-y-1 text-xs break-all">
          <p>Relatório: {r.id}</p>
          <p>Emissão: {delivery.delivery_id}</p>
          <p>SHA256: {delivery.digest}</p>
          <p>Registros selecionados: {r.selected_records_digest}</p>
          <p>Manifesto: {r.source_manifest_digest}</p>
          <p>Definição: {r.definition_digest}</p>
          <p>Modelo: {e.pipeline.model || "Sem modelo de IA"}</p>
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
