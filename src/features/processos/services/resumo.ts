import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

const schema = z
  .object({
    summary: z.string(),
    current_status: z.string(),
    generated_at: z.string(),
    key_dates_and_deadlines: z.array(
      z.object({
        kind: z.string(),
        end_date: z.string(),
        days_remaining: z.number(),
        urgency: z.string(),
        source: z.string(),
      }),
    ),
    recent_movements: z.array(
      z.object({
        occurred_at: z.string(),
        text: z.string(),
        source: z.string(),
      }),
    ),
    risks: z.array(z.object({ description: z.string(), source: z.string() })),
    recommended_actions: z.array(
      z.object({ action: z.string(), source: z.string() }),
    ),
    ai_result_id: z.uuid().optional(),
    result_origin: z.literal("ai").optional(),
  })
  .refine((r) => !!r.ai_result_id === !!r.result_origin);

export type ProcessResume = z.infer<typeof schema>;
/** This legacy GET can generate on first access: callers must invoke it explicitly. */
export async function getResumo(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
): Promise<ProcessResume> {
  return schema.parse(
    await api<unknown>(`/v1/processos/${encodeURIComponent(id)}/resume`, {
      method: "GET",
      signal,
    }),
  );
}
