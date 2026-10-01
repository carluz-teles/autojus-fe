import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import { feedbackScopeSchema, metricsPeriodSchema } from "./feedback-metrics";

const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const channel = z.enum(["random", "correction", "negative", "positive"]);
const channelCounts = z.object({
  random: count,
  correction: count,
  negative: count,
  positive: count,
});
export const feedbackQueueQuotasSchema = channelCounts.refine(
  (q) =>
    Object.values(q).every((n) => n >= 1) &&
    Object.values(q).reduce((a, b) => a + b, 0) <= 100,
  { message: "Reserve ao menos um caso por canal, somando até 100." },
);
export const feedbackQueueFormSchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    quotas: feedbackQueueQuotasSchema,
  })
  .refine((v) => metricsPeriodSchema.safeParse(v).success, {
    path: ["to"],
    message: "Escolha até 31 dias UTC inclusivos.",
  });
export const feedbackCurationScopeSchema = feedbackScopeSchema.extend({
  allowed_purposes: z
    .array(z.enum(["evaluation", "training", "rag"]))
    .min(1)
    .max(3),
});
export type FeedbackCurationScope = z.infer<typeof feedbackCurationScopeSchema>;
export type FeedbackQueueForm = z.infer<typeof feedbackQueueFormSchema>;
export type FeedbackQueueCommand = FeedbackQueueForm & {
  request_id: string;
  scope_id: string;
  expected_scope_revision: number;
};
const summarySchema = z.object({
  id: z.uuid(),
  scope_id: z.uuid(),
  scope_revision: count.min(1),
  from: z.iso.date(),
  to: z.iso.date(),
  manifest_digest: digest,
  selected_count: count.max(100),
  frozen_at: z.iso.datetime({ offset: true }),
});
const queueSchema = summarySchema
  .extend({
    algorithm: z.literal("feedback-interest-v1"),
    seed: z.uuid(),
    population_count: count.max(5000),
    quotas: feedbackQueueQuotasSchema,
    counts: channelCounts,
    replayed: z.boolean(),
    items: z
      .array(
        z.object({
          result_id: z.uuid(),
          task_key: z.string().min(1),
          target_kind: z.string().min(1),
          yes_votes: count,
          no_votes: count,
          corrections: count,
          signal_digest: digest,
          channel,
          available: z.boolean(),
        }),
      )
      .max(100),
  })
  .refine(
    (q) =>
      q.selected_count === q.items.length &&
      q.population_count >= q.selected_count &&
      new Set(q.items.map((x) => x.result_id)).size === q.items.length &&
      channel.options.every(
        (c) =>
          q.counts[c] <= q.quotas[c] &&
          q.counts[c] === q.items.filter((x) => x.channel === c).length,
      ),
  );
export type FeedbackQueue = z.infer<typeof queueSchema>;
export async function listFeedbackCurationScopes(
  api: ApiFetcher,
  signal?: AbortSignal,
) {
  const response = await api<{ data: unknown }>(
    "/v1/curation/feedback-curation-scopes",
    { signal },
  );
  return z.array(feedbackCurationScopeSchema).max(100).parse(response.data);
}
export async function freezeFeedbackQueue(
  api: ApiFetcher,
  command: FeedbackQueueCommand,
) {
  const body = {
    ...feedbackQueueFormSchema.parse(command),
    request_id: z.uuid().parse(command.request_id),
    scope_id: z.uuid().parse(command.scope_id),
    expected_scope_revision: count
      .min(1)
      .parse(command.expected_scope_revision),
  };
  const response = await api<{ data: unknown }>(
    "/v1/curation/feedback-queues",
    { method: "POST", body },
  );
  const queue = queueSchema.parse(response.data);
  if (
    queue.scope_id !== body.scope_id ||
    queue.scope_revision !== body.expected_scope_revision ||
    queue.from !== body.from ||
    queue.to !== body.to ||
    channel.options.some((c) => queue.quotas[c] !== body.quotas[c])
  )
    throw new Error("Recibo de outra seleção.");
  return queue;
}
export async function getFeedbackQueue(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const response = await api<{ data: unknown }>(
    `/v1/curation/feedback-queues/${z.uuid().parse(id)}`,
    { signal },
  );
  const queue = queueSchema.parse(response.data);
  if (queue.id !== id) throw new Error("Recibo de outra fila.");
  return queue;
}
export async function listFeedbackQueues(
  api: ApiFetcher,
  scope: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    scope_id: z.uuid().parse(scope),
    limit: "20",
  });
  if (cursor) params.set("cursor", z.uuid().parse(cursor));
  const response = await api<unknown>(
    `/v1/curation/feedback-queues?${params}`,
    { signal },
  );
  const page = z
    .object({
      data: z.array(summarySchema).max(20),
      page: z.object({
        next_cursor: z.uuid().nullable(),
        limit: z.literal(20),
      }),
    })
    .parse(response);
  if (page.data.some((q) => q.scope_id !== scope))
    throw new Error("Lista de outro escopo.");
  return page;
}
const labels = {
  random: "Aleatória",
  correction: "Correções explícitas",
  negative: "Feedback negativo",
  positive: "Feedback positivo",
};
export const feedbackQueueChannels = channel.options.map((key) => ({
  key,
  label: labels[key],
}));
export function feedbackQueueView(queue: FeedbackQueue) {
  return {
    channels: feedbackQueueChannels.map((c) => ({
      ...c,
      requested: queue.quotas[c.key],
      selected: queue.counts[c.key],
      missing: queue.quotas[c.key] - queue.counts[c.key],
    })),
    items: queue.items.map((i) => ({ ...i, channelLabel: labels[i.channel] })),
  };
}
