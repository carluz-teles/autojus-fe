import { z } from "zod";

import { ApiError } from "@/lib/api/errors";
import type { ApiFetcher } from "@/lib/api/use-api";

import {
  evaluationDeliverySchema,
  evaluationMetadataSchema,
  evaluationPlanSchema,
  evaluationPlanSummarySchema,
  evaluationPreviewSchema,
  type EvaluationRun,
  evaluationRunSchema,
  type EvaluationSelection,
  evaluationSelectionSchema,
} from "./evaluation-schemas";

const root = "/v1/curation";
export const evaluationKeys = {
  all: ["curation", "evaluations"] as const,
  list: (release: string) =>
    ["curation", "evaluations", "list", release] as const,
  plan: (id: string) => ["curation", "evaluations", "plan", id] as const,
  run: (id: string) => ["curation", "evaluations", "run", id] as const,
  report: (id: string) => ["curation", "evaluations", "report", id] as const,
};
export interface FreezeEvaluationCommand {
  request_id: string;
  selection: EvaluationSelection;
  expected_preview_digest: string;
  confirmed: true;
}
export interface RunEvaluationCommand {
  plan: string;
  body: {
    request_id: string;
    expected_definition_digest: string;
    confirmed: true;
  };
}
export interface ReportEvaluationCommand {
  run: string;
  plan: string;
  body: {
    request_id: string;
    expected_definition_digest: string;
    confirmed_exposure: true;
  };
}
export function sameEvaluationSelection(a: unknown, b: unknown) {
  const x = evaluationSelectionSchema.safeParse(a),
    y = evaluationSelectionSchema.safeParse(b);
  return (
    x.success && y.success && JSON.stringify(x.data) === JSON.stringify(y.data)
  );
}
export async function previewEvaluationPlan(
  api: ApiFetcher,
  selection: EvaluationSelection,
) {
  const body = evaluationSelectionSchema.parse(selection);
  const { data } = await api<{ data: unknown }>(
    `${root}/evaluation-plan-preview`,
    { method: "POST", body },
  );
  const preview = evaluationPreviewSchema.parse(data);
  if (!sameEvaluationSelection(preview.selection, body))
    throw new Error("Preview não corresponde à seleção atual.");
  return preview;
}
export async function freezeEvaluationPlan(
  api: ApiFetcher,
  body: FreezeEvaluationCommand,
) {
  const { data } = await api<{ data: unknown }>(`${root}/evaluation-plans`, {
    method: "POST",
    body,
  });
  const plan = evaluationPlanSchema.parse(data);
  if (
    plan.request_id !== body.request_id ||
    plan.definition_digest !== body.expected_preview_digest ||
    !sameEvaluationSelection(plan.preview.selection, body.selection)
  )
    throw new Error("Recupere o envio para conferir o plano recebido.");
  return plan;
}
export async function getEvaluationPlan(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/evaluation-plans/${encodeURIComponent(id)}`,
    { signal },
  );
  const plan = evaluationPlanSchema.parse(data);
  if (plan.id !== id)
    throw new Error("Plano recebido não corresponde à seleção.");
  return plan;
}
export async function listEvaluationPlans(
  api: ApiFetcher,
  release: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const response = await api<unknown>(
    `${root}/dataset-releases/${encodeURIComponent(release)}/evaluation-plans`,
    { query: { limit: 20, ...(cursor ? { cursor } : {}) }, signal },
  );
  const page = z
    .strictObject({
      data: z.array(evaluationPlanSummarySchema).max(20),
      page: z.strictObject({
        next_cursor: z.string().nullable(),
        limit: z.int(),
      }),
    })
    .parse(response);
  if (page.data.some((p) => p.release_id !== release))
    throw new Error("Histórico incompatível com o dataset.");
  return page;
}
export async function getEvaluationRun(
  api: ApiFetcher,
  plan: string,
  signal?: AbortSignal,
) {
  try {
    const { data } = await api<{ data: unknown }>(
      `${root}/evaluation-plans/${encodeURIComponent(plan)}/run`,
      { signal },
    );
    const run = evaluationRunSchema.parse(data);
    if (run.plan_id !== plan)
      throw new Error("Execução incompatível com o plano.");
    return run;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
export async function requestEvaluationRun(
  api: ApiFetcher,
  command: RunEvaluationCommand,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/evaluation-plans/${encodeURIComponent(command.plan)}/run`,
    { method: "POST", body: command.body },
  );
  const run = evaluationRunSchema.parse(data);
  if (
    run.plan_id !== command.plan ||
    run.request_id !== command.body.request_id ||
    run.definition_digest !== command.body.expected_definition_digest
  )
    throw new Error("Recupere o pedido para conferir a execução recebida.");
  return run;
}
export async function getEvaluationReportMetadata(
  api: ApiFetcher,
  run: string,
  signal?: AbortSignal,
) {
  try {
    const { data } = await api<{ data: unknown }>(
      `${root}/evaluation-runs/${encodeURIComponent(run)}/report`,
      { signal },
    );
    const metadata = evaluationMetadataSchema.parse(data);
    if (metadata.run_id !== run)
      throw new Error("Metadados incompatíveis com a execução.");
    return metadata;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
export async function issueEvaluationReport(
  api: ApiFetcher,
  command: ReportEvaluationCommand,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/evaluation-runs/${encodeURIComponent(command.run)}/report`,
    { method: "POST", body: command.body },
  );
  const delivery = evaluationDeliverySchema.parse(data);
  if (
    delivery.request_id !== command.body.request_id ||
    delivery.report.run_id !== command.run ||
    delivery.report.plan_id !== command.plan ||
    delivery.report.definition_digest !==
      command.body.expected_definition_digest
  )
    throw new Error("Recupere a emissão para conferir o relatório recebido.");
  return delivery;
}
export function evaluationPoll(
  run: EvaluationRun | null | undefined,
  status: string,
) {
  return status !== "error" &&
    (run?.state === "queued" || run?.state === "running")
    ? 2000
    : false;
}
export function evaluationTerminal(run: EvaluationRun | null | undefined) {
  return !!run && ["completed", "blocked", "uncertain"].includes(run.state);
}
export const evaluationStateLabels: Record<string, string> = {
  queued: "Na fila",
  running: "Em execução",
  completed: "Processamento concluído",
  failed: "Falha na execução",
  blocked: "Bloqueado",
  uncertain: "Resultado incerto",
};
