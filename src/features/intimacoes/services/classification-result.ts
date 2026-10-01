import { z } from "zod";

import { formatDate } from "@/lib/format";

import { tipoAtoLabel } from "../lib/tipo-ato";

const schema = z.object({
  ai_result_id: z.uuid(),
  result_origin: z.literal("ai_with_rules"),
  deadline_id: z.uuid(),
  recorded_at: z.string().min(1),
  state: z.enum(["answered", "abstained", "invalid"]),
  application: z.enum(["applied", "unchanged"]),
  suggested_type: z.string(),
  suggested_label: z.string(),
  resolved_label: z.string(),
  alternative: z.string(),
  alternative_label: z.string(),
  requires_review: z.boolean(),
  provisional: z.boolean(),
  calculation: z.object({
    schema_version: z.literal(1),
    tipo_ato: z.string(),
    days: z.number().int().nonnegative(),
    counting: z.enum(["BUSINESS", "CALENDAR"]),
    doubled: z.boolean(),
    manual_extra_days: z.number().int().nonnegative(),
    start_date: z.string(),
    end_date: z.string().nullable(),
    legal_citation: z.string().nullable(),
  }),
});

function actLabel(key: string, label = "") {
  if (label) return label;
  if (!key || key === "indeterminado") return "A definir";
  return tipoAtoLabel(key);
}

/** Only the independently identified, displayed classifier output can receive a vote. */
export function classificationResult(value: unknown, deadlineId?: string) {
  const parsed = schema.safeParse(value);
  if (!parsed.success || parsed.data.deadline_id !== deadlineId) return null;
  const r = parsed.data;
  const c = r.calculation;
  const states = {
    answered: actLabel(r.suggested_type, r.suggested_label),
    abstained: "Não foi possível sugerir um ato",
    invalid: "A resposta não pôde ser interpretada",
  };
  return {
    id: r.ai_result_id,
    date: formatDate(r.recorded_at),
    suggestion: states[r.state],
    alternative: r.alternative
      ? actLabel(r.alternative, r.alternative_label)
      : null,
    resolved: actLabel(c.tipo_ato, r.resolved_label),
    period: c.end_date
      ? `${c.days} dias ${c.counting === "BUSINESS" ? "úteis" : "corridos"}${c.doubled ? " (em dobro)" : ""}${c.manual_extra_days ? `, mais ${c.manual_extra_days} dias adicionais` : ""}`
      : null,
    start: formatDate(c.start_date),
    end: c.end_date
      ? formatDate(c.end_date)
      : "Nenhuma data determinada nesta resposta",
    citation: c.legal_citation,
    review: r.provisional
      ? "Cálculo provisório — exige revisão"
      : r.requires_review
        ? "Sugestão sujeita a revisão"
        : null,
  };
}

export type DeadlineClassificationResult = NonNullable<
  ReturnType<typeof classificationResult>
>;
