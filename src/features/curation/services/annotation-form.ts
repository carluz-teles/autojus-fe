import { z } from "zod";

import { TIPO_ATO_LABEL } from "@/features/intimacoes/lib/tipo-ato";

import type {
  AnnotationEditorInput,
  SnapshotDeadlineCue,
} from "./annotation-assignments";
import {
  type AnnotationEvidence,
  annotationSchemaForTask,
} from "./annotation-schema";

const nullableText = z.string().nullable();
const evidence = z.strictObject({
  quote: z.string(),
  start: z.int(),
  end: z.int(),
});
const draftDeadline = z.strictObject({
  kind: z.string(),
  quantity: z.int().nullable(),
  unit: nullableText,
  evidence: evidence.nullable(),
  anchor_event: nullableText,
  start_rule: nullableText,
  anchor_date: nullableText,
  due_date: nullableText,
  date_status: z.string(),
  legal_rule_ref: nullableText,
  calendar_ref: nullableText,
  event: nullableText,
  condition: nullableText,
  reason: nullableText,
});
const draftAct = z.strictObject({
  act_type: nullableText,
  recipient: z.string(),
  actionability: z.string(),
  evidence,
  deadline: draftDeadline,
});
export const annotationDraftSchema = z.strictObject({
  schema_version: z.string(),
  catalog_version: z.string(),
  normalization_version: z.string(),
  snapshot_digest: z.string(),
  label: z.strictObject({
    answerability: z.string(),
    missing_context: z.array(z.string()).max(32),
    acts: z.array(draftAct).max(32),
    abstention_reason: nullableText,
  }),
});
export type AnnotationFormValues = z.infer<typeof annotationDraftSchema>;
export type AnnotationFormAct = z.infer<typeof draftAct>;
export type AnnotationFormDeadline = z.infer<typeof draftDeadline>;

export const answerabilityOptions = [
  { value: "determinate", label: "Consigo definir todas as dimensões" },
  { value: "partial", label: "Consigo definir parte da resposta" },
  { value: "insufficient", label: "O contexto é insuficiente" },
];
export const recipientOptions = [
  { value: "client", label: "Cliente" },
  { value: "opponent", label: "Parte contrária" },
  { value: "both", label: "Ambas as partes" },
  { value: "court", label: "Juízo" },
  { value: "third_party", label: "Terceiro" },
  { value: "unknown", label: "Não identificado" },
];
export const actionabilityOptions = [
  { value: "duty", label: "Obrigação" },
  { value: "opportunity", label: "Faculdade / oportunidade" },
  { value: "awareness", label: "Ciência" },
  { value: "unresolved", label: "Não determinada" },
];
export const deadlineKindOptions = [
  { value: "explicit", label: "Prazo escrito na intimação" },
  { value: "legal_rule", label: "Prazo previsto em regra revisada" },
  { value: "scheduled_date", label: "Data de evento / audiência" },
  { value: "none", label: "Não há prazo" },
  { value: "unknown", label: "Não foi possível definir" },
];
export const deadlineUnitOptions = [
  { value: "business_days", label: "Dias úteis" },
  { value: "calendar_days", label: "Dias corridos" },
  { value: "hours", label: "Horas" },
  { value: "minutes", label: "Minutos" },
  { value: "months", label: "Meses" },
  { value: "years", label: "Anos" },
];
export { importContextLabels as contextLabels } from "./import-context";
export const optionalText = (value: unknown) => (value === "" ? null : value);
export const optionalQuantity = (value: unknown) =>
  value === "" ? null : Number(value);

export function emptyAnnotationDeadline(kind = ""): AnnotationFormDeadline {
  return {
    kind,
    quantity: null,
    unit: null,
    evidence: null,
    anchor_event: null,
    start_rule: null,
    anchor_date: null,
    due_date: null,
    date_status:
      kind === "none"
        ? "not_applicable"
        : kind === "scheduled_date"
          ? "specified"
          : "missing_context",
    legal_rule_ref: null,
    calendar_ref: null,
    event: null,
    condition: null,
    reason: null,
  };
}
export function emptyAnnotationAct(): AnnotationFormAct {
  return {
    act_type: null,
    recipient: "",
    actionability: "",
    evidence: { quote: "", start: 0, end: 0 },
    deadline: emptyAnnotationDeadline(),
  };
}
export function annotationDefaults(
  input: AnnotationEditorInput,
): AnnotationFormValues {
  const { contract } = input.protocol;
  const base = {
    schema_version: contract.schema_version,
    catalog_version: contract.catalog_version,
    normalization_version: contract.normalization_version,
    snapshot_digest: input.snapshot_digest,
    label: {
      answerability: "",
      missing_context: [] as string[],
      acts: [] as AnnotationFormAct[],
      abstention_reason: null,
    },
  };
  if (input.draft?.annotation == null) return base;
  return restoreAnnotationDraft(input.draft.annotation, base);
}
// Accept incomplete server drafts without silently discarding unknown fields or
// importing answers tied to another frozen text/catalog. Invalid drafts stay on
// the server and are shown as a recovery error, never replaced with a blank save.
export function restoreAnnotationDraft(
  raw: unknown,
  base: AnnotationFormValues,
): AnnotationFormValues {
  const partialEvidence = evidence.partial();
  const partialDeadline = draftDeadline
    .extend({ evidence: partialEvidence.nullable().optional() })
    .partial();
  const partialAct = draftAct
    .extend({
      evidence: partialEvidence.optional(),
      deadline: partialDeadline.optional(),
    })
    .partial();
  const partial = annotationDraftSchema
    .extend({
      label: z
        .strictObject({
          answerability: z.string().optional(),
          missing_context: z.array(z.string()).optional(),
          acts: z.array(partialAct).optional(),
          abstention_reason: nullableText.optional(),
        })
        .optional(),
    })
    .partial()
    .parse(raw);
  for (const key of [
    "schema_version",
    "catalog_version",
    "normalization_version",
    "snapshot_digest",
  ] as const)
    if (partial[key] !== undefined && partial[key] !== base[key])
      throw new Error(
        "O rascunho pertence a outro texto ou contrato. Preserve-o e confira a atribuição.",
      );
  return annotationDraftSchema.parse({
    ...base,
    ...partial,
    label: {
      ...base.label,
      ...partial.label,
      acts: (partial.label?.acts ?? base.label.acts).map((act) => ({
        ...emptyAnnotationAct(),
        ...act,
        evidence: { ...emptyAnnotationAct().evidence, ...act.evidence },
        deadline: {
          ...emptyAnnotationDeadline(),
          ...act.deadline,
          evidence: act.deadline?.evidence
            ? { quote: "", start: 0, end: 0, ...act.deadline.evidence }
            : null,
        },
      })),
    },
  });
}
export function annotationForSubmission(
  values: AnnotationFormValues,
  input: AnnotationEditorInput,
) {
  const normalized = {
    ...values,
    label: {
      ...values.label,
      missing_context: values.label.missing_context
        .map((v) => v.trim())
        .filter(Boolean),
    },
  };
  return annotationSchemaForTask(
    input.snapshot.facts.text,
    input.snapshot_digest,
    input.protocol.contract,
  ).safeParse(normalized);
}
export function deadlineFromCue(
  cue: SnapshotDeadlineCue,
): AnnotationFormDeadline {
  if (!cue.exact_source_span || cue.start < 0 || cue.end <= cue.start)
    throw new Error("A sugestão não possui um trecho exato selecionável.");
  return {
    ...emptyAnnotationDeadline("explicit"),
    quantity: cue.quantity,
    unit: cue.unit || null,
    evidence: { quote: cue.quote, start: cue.start, end: cue.end },
  };
}
export function changeAnnotationDeadline(
  previous: AnnotationFormDeadline,
  kind: string,
) {
  const next = {
    ...emptyAnnotationDeadline(kind),
    reason: previous.reason,
    condition: previous.condition,
    evidence: previous.evidence,
  };
  if (
    kind === "explicit" &&
    ["explicit", "legal_rule"].includes(previous.kind)
  ) {
    next.quantity = previous.quantity;
    next.unit = previous.unit;
  }
  return next;
}
export function evidencePreview(value: AnnotationEvidence | null) {
  return value?.quote || "Nenhum trecho selecionado.";
}

export function annotationValidationMessages(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];
  if ("message" in errors && typeof errors.message === "string")
    return [errors.message];
  return Object.entries(errors)
    .filter(([key]) => key !== "ref")
    .flatMap(([, value]) => annotationValidationMessages(value));
}

export function annotationActTypeLabel(
  key: string,
  labels?: Record<string, string>,
) {
  return (labels?.[key] ?? TIPO_ATO_LABEL[key] ?? key) || "Tipo não definido";
}

export function annotationLeaseLabel(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export function annotationAnswerRows(raw: unknown) {
  const parsed = annotationDraftSchema.safeParse(raw);
  if (!parsed.success) return null;
  const { label } = parsed.data;
  return {
    answerability:
      answerabilityOptions.find(
        (option) => option.value === label.answerability,
      )?.label ?? "Ainda não respondido",
    missingContext: label.missing_context.filter(Boolean),
    abstentionReason: label.abstention_reason,
    acts: label.acts.map((act) => ({
      type: act.act_type
        ? annotationActTypeLabel(act.act_type)
        : "Tipo não definido",
      recipient:
        recipientOptions.find((option) => option.value === act.recipient)
          ?.label ?? "Ainda não respondido",
      actionability:
        actionabilityOptions.find(
          (option) => option.value === act.actionability,
        )?.label ?? "Ainda não respondido",
      evidence: evidencePreview(act.evidence),
      deadlineEvidence: evidencePreview(act.deadline.evidence),
      kind:
        deadlineKindOptions.find((option) => option.value === act.deadline.kind)
          ?.label ?? "Prazo não classificado",
      period:
        act.deadline.quantity === null
          ? null
          : `${act.deadline.quantity} ${deadlineUnitOptions.find((option) => option.value === act.deadline.unit)?.label ?? "(unidade não definida)"}`,
      date: act.deadline.due_date,
      event: act.deadline.event,
      reason: act.deadline.reason,
      condition: act.deadline.condition,
      details: [
        ["Evento inicial", act.deadline.anchor_event],
        ["Regra de início", act.deadline.start_rule],
        ["Data do evento inicial", act.deadline.anchor_date],
        ["Regra jurídica", act.deadline.legal_rule_ref],
        ["Calendário", act.deadline.calendar_ref],
        [
          "Situação da data",
          (
            {
              missing_context: "Contexto insuficiente",
              not_applicable: "Não se aplica",
              specified: "Indicada no texto",
              calculated: "Calculada",
            } as Record<string, string>
          )[act.deadline.date_status] ?? act.deadline.date_status,
        ],
      ].filter((entry): entry is [string, string] => !!entry[1]),
    })),
  };
}
