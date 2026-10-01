import { z } from "zod";

const schema = z
  .object({
    analysis_id: z.uuid(),
    ai_result_id: z.uuid(),
    result_origin: z.literal("ai_with_rules"),
    ato: z.string(),
    analyzed_at: z.string(),
    contexto: z
      .object({
        situacao: z.string(),
        o_que_aconteceu: z.string(),
        o_que_se_espera: z.string(),
        fundamentos: z.array(
          z.object({ ref: z.string(), norma: z.string(), citacao: z.string() }),
        ),
      })
      .nullable(),
    providencias: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        due_date: z.string().nullable(),
      }),
    ),
  })
  .refine((r) => r.analysis_id === r.ai_result_id);

export type IntimationAnalysisResult = z.infer<typeof schema>;

/** Project only a complete, identified original response. Never infer legacy provenance. */
export function analysisResult(
  value: unknown,
): IntimationAnalysisResult | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
