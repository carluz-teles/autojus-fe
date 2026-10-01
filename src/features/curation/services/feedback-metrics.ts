import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const feedbackScopeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  period_start: z.iso.date(),
  period_end: z.iso.date(),
  valid_until: z.iso.datetime({ offset: true }),
  minimum_contributors: count.min(1),
  revision: count.min(1),
});
const countsSchema = z
  .object({
    generated_results: count,
    exposed_pairs: count,
    exposed_people: count,
    observation_days: count,
    active_votes: count,
    yes_votes: count,
    no_votes: count,
    withdrawn_votes: count,
    corrections: count,
    votes_with_exposure: count,
    vote_contributors: count,
    max_contributor_votes: count,
    population_contributors: count,
  })
  .refine(
    (c) =>
      c.active_votes === c.yes_votes + c.no_votes &&
      c.votes_with_exposure <= c.active_votes &&
      c.votes_with_exposure <= c.exposed_pairs &&
      c.exposed_people <= c.exposed_pairs &&
      c.observation_days >= c.exposed_pairs &&
      c.vote_contributors <= c.active_votes &&
      c.max_contributor_votes <= c.active_votes &&
      c.corrections <= c.active_votes,
  );
const rowSchema = z.object({
  task_key: z.string().min(1),
  target_kind: z.string().min(1),
  resolved_model: z.string().min(1),
  routing_policy: z.string().min(1),
  prompt_version: z.string().min(1),
  evidence_version: z.string().min(1),
  counts: countsSchema.nullable(),
});
const reportSchema = z
  .object({
    version: z.literal("feedback-metrics-v1"),
    scope: feedbackScopeSchema,
    period_start: z.iso.date(),
    period_end: z.iso.date(),
    as_of: z.iso.datetime({ offset: true }),
    rows: z.array(rowSchema).max(200),
  })
  .refine((r) =>
    r.rows.every(
      (row) =>
        !row.counts ||
        row.counts.population_contributors >= r.scope.minimum_contributors,
    ),
  );
export type FeedbackMetricScope = z.infer<typeof feedbackScopeSchema>;
export type FeedbackMetricRow = z.infer<typeof rowSchema>;
export const metricsPeriodSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine(
    (p) => {
      const span = Date.parse(p.to) - Date.parse(p.from);
      return span >= 0 && span < 31 * 86400000;
    },
    {
      message: "Escolha até 31 dias consecutivos, incluindo início e fim.",
      path: ["to"],
    },
  );
export type MetricsPeriod = z.infer<typeof metricsPeriodSchema>;
export async function listFeedbackScopes(
  api: ApiFetcher,
  signal?: AbortSignal,
) {
  const response = await api<{ data: unknown }>(
    "/v1/curation/feedback-scopes",
    { signal },
  );
  return z.array(feedbackScopeSchema).max(100).parse(response.data);
}
export async function getFeedbackMetrics(
  api: ApiFetcher,
  id: string,
  period: MetricsPeriod,
  signal?: AbortSignal,
) {
  const p = metricsPeriodSchema.parse(period);
  const query = new URLSearchParams(p);
  const response = await api<{ data: unknown }>(
    `/v1/curation/feedback-scopes/${z.uuid().parse(id)}/metrics?${query}`,
    { signal },
  );
  const report = reportSchema.parse(response.data);
  if (
    report.scope.id !== id ||
    report.period_start !== p.from ||
    report.period_end !== p.to
  )
    throw new Error("Relatório de outro escopo ou período.");
  return report;
}
export function defaultMetricsPeriod(
  scope: FeedbackMetricScope,
): MetricsPeriod {
  const today = new Date().toISOString().slice(0, 10);
  const to = today < scope.period_end ? today : scope.period_end;
  const start = new Date(Date.parse(to) - 6 * 86400000)
    .toISOString()
    .slice(0, 10);
  return { from: start > scope.period_start ? start : scope.period_start, to };
}
function fraction(part: number, total: number) {
  return total
    ? `${part} de ${total} (${Math.round((part / total) * 100)}%)`
    : "Sem denominador observado";
}
export function metricRows(rows: FeedbackMetricRow[]) {
  return rows.map((row) => {
    const c = row.counts;
    return {
      ...row,
      key: JSON.stringify([
        row.task_key,
        row.target_kind,
        row.resolved_model,
        row.routing_policy,
        row.prompt_version,
        row.evidence_version,
      ]),
      metrics: c
        ? [
            {
              label: "Resultados gerados e persistidos",
              value: c.generated_results,
            },
            { label: "Pares pessoa/resposta expostos", value: c.exposed_pairs },
            { label: "Pessoas com exposição", value: c.exposed_people },
            {
              label: "Observações pessoa/resposta/dia",
              value: c.observation_days,
            },
            { label: "Votos ativos", value: c.active_votes },
            { label: "Sim", value: c.yes_votes },
            { label: "Não", value: c.no_votes },
            { label: "Votos retirados", value: c.withdrawn_votes },
            { label: "Votos com correção explícita", value: c.corrections },
            {
              label: "Contribuidores com voto ativo",
              value: c.vote_contributors,
            },
          ]
        : [],
      participation: c
        ? fraction(c.votes_with_exposure, c.exposed_pairs)
        : null,
      concentration: c
        ? fraction(c.max_contributor_votes, c.active_votes)
        : null,
    };
  });
}
