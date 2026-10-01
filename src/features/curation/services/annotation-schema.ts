import { z } from "zod";

const encoder = new TextEncoder();
const textField = z
  .string()
  .refine(
    (value) => value.trim().length > 0 && encoder.encode(value).length <= 2000,
    "Informe texto válido.",
  );
const evidenceSchema = z.strictObject({
  quote: z.string().refine((value) => value.trim().length > 0),
  start: z.int().nonnegative(),
  end: z.int().positive(),
});
const deadlineSchema = z.strictObject({
  kind: z.enum(["explicit", "legal_rule", "scheduled_date", "none", "unknown"]),
  quantity: z.int().positive().nullable(),
  unit: z
    .enum([
      "business_days",
      "calendar_days",
      "hours",
      "minutes",
      "months",
      "years",
    ])
    .nullable(),
  evidence: evidenceSchema.nullable(),
  anchor_event: textField.nullable(),
  start_rule: textField.nullable(),
  anchor_date: z.iso.date().nullable(),
  due_date: z.iso.date().nullable(),
  date_status: z.enum([
    "missing_context",
    "not_applicable",
    "specified",
    "calculated",
  ]),
  legal_rule_ref: textField.nullable(),
  calendar_ref: textField.nullable(),
  event: textField.nullable(),
  condition: textField.nullable(),
  reason: textField.nullable(),
});
export const intimationAnnotationSchema = z.strictObject({
  schema_version: z.literal("intimation-label-v1"),
  catalog_version: textField,
  normalization_version: textField,
  snapshot_digest: z.string().regex(/^[a-f0-9]{64}$/),
  label: z.strictObject({
    answerability: z.enum(["determinate", "partial", "insufficient"]),
    missing_context: z
      .array(
        z
          .string()
          .refine(
            (value) =>
              value.trim().length > 0 && encoder.encode(value).length <= 200,
          ),
      )
      .max(32),
    acts: z
      .array(
        z.strictObject({
          act_type: textField.nullable(),
          recipient: z.enum([
            "client",
            "opponent",
            "both",
            "court",
            "third_party",
            "unknown",
          ]),
          actionability: z.enum([
            "duty",
            "opportunity",
            "awareness",
            "unresolved",
          ]),
          evidence: evidenceSchema,
          deadline: deadlineSchema,
        }),
      )
      .max(32),
    abstention_reason: textField.nullable(),
  }),
});

export type IntimationAnnotation = z.infer<typeof intimationAnnotationSchema>;
export type AnnotationEvidence = z.infer<typeof evidenceSchema>;
export interface AnnotationContract {
  schema_version: string;
  catalog_version: string;
  normalization_version: string;
  act_types: string[];
  legal_rules: Record<
    string,
    { quantity: number; unit: string; anchor_event: string; start_rule: string }
  >;
}

export function evidenceFromSelection(
  text: string,
  start: number,
  end: number,
): AnnotationEvidence {
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start ||
    end > text.length ||
    splitsSurrogate(text, start) ||
    splitsSurrogate(text, end)
  )
    throw new Error("Selecione um trecho completo do texto.");
  return evidenceSchema.parse({
    quote: text.slice(start, end),
    start: encoder.encode(text.slice(0, start)).length,
    end: encoder.encode(text.slice(0, end)).length,
  });
}

function splitsSurrogate(text: string, offset: number) {
  const previous = text.charCodeAt(offset - 1),
    current = text.charCodeAt(offset);
  return (
    previous >= 0xd800 &&
    previous <= 0xdbff &&
    current >= 0xdc00 &&
    current <= 0xdfff
  );
}

function matchesEvidence(bytes: Uint8Array, evidence: AnnotationEvidence) {
  if (
    evidence.start < 0 ||
    evidence.end <= evidence.start ||
    evidence.end > bytes.length
  )
    return false;
  try {
    return (
      new TextDecoder("utf-8", { fatal: true }).decode(
        bytes.slice(evidence.start, evidence.end),
      ) === evidence.quote
    );
  } catch {
    return false;
  }
}

// User-facing validation; the backend independently verifies the frozen task,
// legal rule revision, evidence and any calculated date before accepting it.
export function annotationSchemaForTask(
  text: string,
  digest: string,
  contract: AnnotationContract,
) {
  const bytes = encoder.encode(text);
  return intimationAnnotationSchema.superRefine((annotation, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (
      annotation.schema_version !== contract.schema_version ||
      annotation.catalog_version !== contract.catalog_version ||
      annotation.normalization_version !== contract.normalization_version ||
      annotation.snapshot_digest !== digest
    )
      issue(
        ["snapshot_digest"],
        "A resposta pertence a outra versão da tarefa.",
      );
    const label = annotation.label;
    if (new Set(label.missing_context).size !== label.missing_context.length)
      issue(
        ["label", "missing_context"],
        "Não repita o mesmo contexto faltante.",
      );
    if (
      (label.answerability === "determinate") !==
      (label.missing_context.length === 0)
    )
      issue(
        ["label", "missing_context"],
        "Informe o contexto necessário para as dimensões ainda não resolvidas.",
      );
    if (
      label.answerability === "insufficient"
        ? !label.abstention_reason
        : label.acts.length === 0 || label.abstention_reason !== null
    )
      issue(
        ["label", "abstention_reason"],
        "Registre os atos ou justifique a insuficiência total.",
      );
    label.acts.forEach((act, index) => {
      const base = ["label", "acts", index];
      if (act.act_type !== null && !contract.act_types.includes(act.act_type))
        issue([...base, "act_type"], "Tipo fora do catálogo da tarefa.");
      if (!matchesEvidence(bytes, act.evidence))
        issue([...base, "evidence"], "Trecho diferente do texto congelado.");
      const d = act.deadline;
      if (d.evidence && !matchesEvidence(bytes, d.evidence))
        issue(
          [...base, "deadline", "evidence"],
          "Selecione a evidência nesta versão do texto.",
        );
      const unresolved =
        !act.act_type ||
        act.recipient === "unknown" ||
        act.actionability === "unresolved" ||
        d.kind === "unknown" ||
        d.date_status === "missing_context";
      if (label.answerability === "determinate" && unresolved)
        issue([...base, "deadline"], "Há dimensões ainda não resolvidas.");
      if (d.kind === "none" || d.kind === "unknown") {
        if (
          !d.reason ||
          [
            d.quantity,
            d.unit,
            d.anchor_date,
            d.due_date,
            d.legal_rule_ref,
            d.calendar_ref,
            d.event,
            d.anchor_event,
            d.start_rule,
          ].some((value) => value !== null) ||
          d.date_status !==
            (d.kind === "none" ? "not_applicable" : "missing_context")
        )
          issue(
            [...base, "deadline"],
            "Prazo ausente ou desconhecido exige motivo, sem quantidade ou data.",
          );
      } else if (d.kind === "scheduled_date") {
        if (
          d.quantity !== null ||
          d.unit !== null ||
          !d.due_date ||
          !d.event ||
          !d.evidence ||
          d.date_status !== "specified" ||
          d.legal_rule_ref !== null ||
          d.start_rule !== null ||
          d.anchor_date !== null
        )
          issue(
            [...base, "deadline"],
            "Evento exige data e evidência, sem conversão em dias.",
          );
      } else {
        if (
          !d.quantity ||
          !d.unit ||
          d.event !== null ||
          (d.kind === "explicit" && (!d.evidence || d.legal_rule_ref !== null))
        )
          issue(
            [...base, "deadline"],
            "Confira a quantidade, unidade e evidência do prazo.",
          );
        if (d.kind === "legal_rule") {
          const rule = d.legal_rule_ref
            ? contract.legal_rules[d.legal_rule_ref]
            : undefined;
          if (
            !rule ||
            rule.quantity !== d.quantity ||
            rule.unit !== d.unit ||
            rule.anchor_event !== d.anchor_event ||
            rule.start_rule !== d.start_rule
          )
            issue(
              [...base, "deadline", "legal_rule_ref"],
              "Parâmetros diferentes da regra revisada.",
            );
        }
        if (
          !d.due_date
            ? d.date_status !== "missing_context" || d.calendar_ref !== null
            : d.date_status !== "calculated" ||
              !d.anchor_date ||
              !d.calendar_ref ||
              !d.anchor_event ||
              !d.start_rule ||
              d.due_date < d.anchor_date
        )
          issue(
            [...base, "deadline", "due_date"],
            "Vencimento calculado exige termo inicial, regra e calendário.",
          );
      }
    });
  });
}
