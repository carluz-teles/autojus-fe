import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const inferenceRouteSchema = z.strictObject({
  task: z.literal("curation.annotate_intimation"),
  model: z.string().min(1),
  prompt_version: z.literal("intimation-inference-v1"),
  max_tokens: z.int().min(1).max(16000),
  endpoint: z.string().optional(),
});
const routeViewSchema = z
  .strictObject({
    enabled: z.boolean(),
    route: inferenceRouteSchema.nullable(),
    digest: z.string(),
    max_http_calls: z.literal(1),
  })
  .refine(
    (v) =>
      !v.enabled || (v.route !== null && digest.safeParse(v.digest).success),
    "Configuração da inferência incompatível.",
  );
const jobSchema = z.strictObject({
  id: z.uuid(),
  request_id: z.uuid(),
  task_id: z.uuid(),
  attempt: z.int().min(1).max(32),
  state: z.enum([
    "queued",
    "running",
    "completed",
    "failed",
    "blocked",
    "uncertain",
  ]),
  failure_code: z.string().nullable(),
  prediction_id: z.uuid().nullable(),
  route_digest: digest,
  route: inferenceRouteSchema,
  requested_at: z.iso.datetime({ offset: true }),
  reserved_at: z.iso.datetime({ offset: true }).nullable(),
  finished_at: z.iso.datetime({ offset: true }).nullable(),
  http_calls_reserved: z.int().min(0).max(1).nullable(),
  cost_usd: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .nullable(),
  late_result: z.boolean(),
  idempotent_replay: z.boolean(),
  rag: z
    .strictObject({
      query_id: z.uuid(),
      index_id: z.uuid(),
      release_id: z.uuid(),
      result_digest: digest,
      model: z.literal("voyage-4"),
      example_count: z.int().min(0).max(5),
    })
    .optional(),
});
export type InferenceRouteView = z.infer<typeof routeViewSchema>;
export type InferenceJob = z.infer<typeof jobSchema>;
export interface InferenceCommand {
  task: string;
  body: {
    request_id: string;
    expected_snapshot_digest: string;
    expected_protocol_digest: string;
    expected_route_digest: string;
    expected_previous_job_id: string | null;
    acknowledged_uncertain_job_id: string | null;
    confirmed: true;
    rag_query_id?: string;
  };
}
export const inferenceKeys = {
  all: ["curation", "inference"] as const,
  route: ["curation", "inference", "route"] as const,
  jobs: (task: string) => ["curation", "inference", "jobs", task] as const,
};
const root = "/v1/curation";
export async function getInferenceRoute(api: ApiFetcher, signal?: AbortSignal) {
  const r = await api<{ data: unknown }>(`${root}/inference-route`, { signal });
  return routeViewSchema.parse(r.data);
}
export async function listInferenceJobs(
  api: ApiFetcher,
  task: string,
  signal?: AbortSignal,
) {
  const r = await api<{ data: unknown }>(
    `${root}/annotation-tasks/${encodeURIComponent(task)}/inference-jobs`,
    { signal },
  );
  const jobs = z.array(jobSchema).max(32).parse(r.data);
  if (
    jobs.some((j) => j.task_id !== task) ||
    new Set(jobs.map((j) => j.id)).size !== jobs.length
  )
    throw new Error("Histórico de inferência incompatível com a tarefa.");
  return jobs.toSorted((a, b) => b.attempt - a.attempt);
}
export async function requestInference(
  api: ApiFetcher,
  command: InferenceCommand,
) {
  const r = await api<{ data: unknown }>(
    `${root}/annotation-tasks/${encodeURIComponent(command.task)}/inference-jobs`,
    { method: "POST", body: command.body },
  );
  const job = jobSchema.parse(r.data);
  if (
    job.task_id !== command.task ||
    job.request_id !== command.body.request_id ||
    job.route_digest !== command.body.expected_route_digest ||
    job.rag?.query_id !== command.body.rag_query_id
  )
    throw new Error(
      "O recibo não corresponde à intenção enviada. Recupere o envio.",
    );
  return job;
}
export const inferenceStateLabels: Record<InferenceJob["state"], string> = {
  queued: "Na fila",
  running: "Execução reservada",
  completed: "Hipótese disponível para revisão",
  failed: "Falha na execução",
  blocked: "Execução bloqueada",
  uncertain: "Resultado incerto — não houve reenvio automático",
};
export function inferencePending(job?: InferenceJob) {
  return job?.state === "queued" || job?.state === "running";
}
export const inferenceConfirmationSchema = z.strictObject({
  confirmed_context: z.string(),
  uncertain_context: z.string(),
});
