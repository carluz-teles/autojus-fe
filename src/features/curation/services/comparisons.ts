import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  comparisonDeliverySchema,
  comparisonMetadataSchema,
  type ComparisonSourceRef,
  comparisonSummarySchema,
} from "./comparison-schemas";
import { type evaluationPlanSummarySchema } from "./evaluation-schemas";
import {
  evaluationTerminal,
  getEvaluationReportMetadata,
  getEvaluationRun,
} from "./evaluations";

export type ComparisonPlan = z.infer<typeof evaluationPlanSummarySchema>;
export const comparisonKeys = {
  all: ["curation", "comparisons"] as const,
  list: (id: string) => ["curation", "comparisons", "list", id] as const,
  metadata: (id: string) =>
    ["curation", "comparisons", "metadata", id] as const,
  source: (id: string) => ["curation", "comparisons", "source", id] as const,
};
export interface CreateComparisonCommand {
  release: string;
  body: {
    request_id: string;
    sources: ComparisonSourceRef[];
    confirmed_exposure: true;
  };
}
export interface IssueComparisonCommand {
  id: string;
  body: {
    request_id: string;
    expected_digest: string;
    confirmed_exposure: true;
  };
}
const root = "/v1/curation";
export async function createComparison(
  api: ApiFetcher,
  command: CreateComparisonCommand,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/dataset-releases/${encodeURIComponent(command.release)}/type-comparisons`,
    { method: "POST", body: command.body },
  );
  const result = comparisonDeliverySchema.parse(data);
  if (
    result.request_id !== command.body.request_id ||
    result.document.comparison.release_id !== command.release ||
    JSON.stringify(result.document.source_reports) !==
      JSON.stringify(command.body.sources)
  )
    throw new Error("Recupere o pedido para conferir as fontes da comparação.");
  return result;
}
export async function issueComparison(
  api: ApiFetcher,
  command: IssueComparisonCommand,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/type-comparisons/${encodeURIComponent(command.id)}/issue`,
    { method: "POST", body: command.body },
  );
  const result = comparisonDeliverySchema.parse(data);
  if (
    result.request_id !== command.body.request_id ||
    result.document.id !== command.id ||
    result.digest !== command.body.expected_digest
  )
    throw new Error("Recupere a emissão para conferir a comparação recebida.");
  return result;
}
export async function getComparisonMetadata(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/type-comparisons/${encodeURIComponent(id)}`,
    { signal },
  );
  const result = comparisonMetadataSchema.parse(data);
  if (result.id !== id)
    throw new Error("Comparação incompatível com a seleção.");
  return result;
}
export async function listComparisons(
  api: ApiFetcher,
  release: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const result = await api<unknown>(
    `${root}/dataset-releases/${encodeURIComponent(release)}/type-comparisons`,
    {
      query: { limit: 20, ...(cursor ? { cursor } : {}) },
      signal,
    },
  );
  const page = z
    .strictObject({
      data: z.array(comparisonSummarySchema).max(20),
      page: z.strictObject({
        next_cursor: z.uuid().nullable(),
        limit: z.int().min(1).max(20),
      }),
    })
    .parse(result);
  if (page.data.some((v) => v.release_id !== release))
    throw new Error("Histórico incompatível com o dataset.");
  return page;
}
export async function getComparisonSource(
  api: ApiFetcher,
  plan: ComparisonPlan,
  signal?: AbortSignal,
) {
  const run = await getEvaluationRun(api, plan.id, signal);
  const report =
    evaluationTerminal(run) && run?.report_available !== false
      ? await getEvaluationReportMetadata(api, run!.id, signal)
      : null;
  if (run && run.definition_digest !== plan.definition_digest)
    throw new Error("Execução incompatível com a definição selecionada.");
  if (
    report &&
    (report.plan_id !== plan.id ||
      report.definition_digest !== plan.definition_digest)
  )
    throw new Error("Relatório incompatível com o plano selecionado.");
  return { run, report };
}
export function comparisonSourceProblem(
  source: Awaited<ReturnType<typeof getComparisonSource>>,
) {
  if (!source.run) return "Este plano ainda não foi executado.";
  if (!evaluationTerminal(source.run)) return "A execução ainda não terminou.";
  if (!source.report)
    return "Emita o relatório na página do plano antes de comparar.";
  if (source.report.evaluator_version !== "type-projection-v1")
    return "Este relatório não avalia somente o tipo do ato.";
  if (!source.report.eligible)
    return "O relatório não está elegível para nova emissão.";
  return null;
}
