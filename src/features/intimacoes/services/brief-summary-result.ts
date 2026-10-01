import { z } from "zod";

const schema = z.object({
  brief_summary: z.string().refine((text) => text.trim().length > 0),
  brief_summary_result_id: z.uuid(),
});

export type BriefSummaryResult = {
  id: string;
  text: string;
};

/** Dedicated server reference for this exact summary, never the latest analysis. */
export function briefSummaryResult(value: unknown): BriefSummaryResult | null {
  const parsed = schema.safeParse(value);
  return parsed.success
    ? {
        id: parsed.data.brief_summary_result_id,
        text: parsed.data.brief_summary,
      }
    : null;
}
