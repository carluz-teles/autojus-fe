import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type { AnnotationEvidence } from "./annotation-schema";
import { commercialContextFields } from "./import-context";
import type { ImportInput, ImportItem } from "./imports";

export interface ImportPrivacyPolicy {
  configured: boolean;
  revision: number;
  sanitization_version: string;
  consent_reference: string;
  anonymization_reference: string;
  retention_reference: string;
  withdrawal_reference: string;
  small_group_reference: string;
}
export interface ImportMatter {
  Key: string;
  Nome: string;
}
export interface ImportRedaction {
  field: string;
  category: string;
  evidence: AnnotationEvidence;
  replacement: string;
}
export const redactionCategories = [
  { value: "person", label: "Pessoa", prefix: "PESSOA" },
  { value: "contact", label: "Contato", prefix: "CONTATO" },
  { value: "address", label: "Endereço", prefix: "ENDERECO" },
  { value: "case_reference", label: "Processo", prefix: "PROCESSO" },
  { value: "document_reference", label: "Documento", prefix: "DOCUMENTO" },
] as const;

export const admissionFormSchema = z
  .object({
    matter_key: z.string().min(1, "Selecione a matéria jurídica."),
    legal_date: z.iso.date(),
    knowledge_as_of: z.iso.datetime({ offset: true }),
    reviewed_at: z.iso.datetime({ offset: true }),
    dataset_key: z.string(),
    consent_receipt: z.string().max(2000),
    consent_confirmed_at: z.string(),
    review_receipt: z
      .string()
      .trim()
      .min(1, "Informe a referência da revisão.")
      .max(2000),
    privacy_reviewed: z
      .boolean()
      .refine(
        Boolean,
        "Revise a privacidade do texto e do contexto completos.",
      ),
    meaning_status: z
      .enum(["preserved", "changed", "uncertain"])
      .refine(
        (value): boolean => value === "preserved",
        "A admissão exige preservação do sentido jurídico.",
      ),
    evaluation: z.boolean(),
    training: z.boolean(),
    rag: z.boolean(),
    expected_batch_revision: z.int().positive(),
    privacy_policy_revision: z.int().nonnegative(),
  })
  .superRefine((form, ctx) => {
    if (!form.evaluation && !form.training && !form.rag)
      ctx.addIssue({
        code: "custom",
        path: ["evaluation"],
        message: "Selecione ao menos uma finalidade autorizada.",
      });
  });
export type AdmissionForm = z.infer<typeof admissionFormSchema>;
export interface ImportedCaseResult {
  admission_id: string | null;
  source_link_id: string;
  text_digest: string;
  idempotent_replay: boolean;
  purposes: string[];
  case: {
    id: string;
    version_id: string;
    source: string;
    facts: { text: string; context: ImportInput["context"] };
  };
}
export function getImportPrivacyPolicy(api: ApiFetcher, signal?: AbortSignal) {
  return api<{ data: ImportPrivacyPolicy }>(
    "/v1/curation/import-privacy-policy",
    { signal },
  ).then((response) => response.data);
}
export function getImportMatters(api: ApiFetcher, signal?: AbortSignal) {
  return api<{ data: ImportMatter[] }>("/v1/matters", { signal }).then(
    (response) => response.data,
  );
}
export function redactionFields(item: ImportItem) {
  return [
    { key: "text", label: "Teor da intimação", text: item.input.text },
    { key: "context.court", label: "Tribunal", text: item.input.context.court },
    {
      key: "context.procedure",
      label: "Procedimento",
      text: item.input.context.procedure,
    },
    {
      key: "context.channel",
      label: "Canal",
      text: item.input.context.channel,
    },
    { key: "context.notes", label: "Notas", text: item.input.context.notes },
    {
      key: "context.recipient_role",
      label: "Papel do destinatário",
      text: item.input.context.recipient_role,
    },
    ...commercialContextFields.map((field) => ({
      key: `context.commercial_type.${field.name}`,
      label: field.label,
      text: item.input.context.commercial_type?.[field.name] ?? null,
    })),
  ].filter(
    (field): field is { key: string; label: string; text: string } =>
      typeof field.text === "string",
  );
}

export function redactionPreview(
  text: string,
  field: string,
  redactions: ImportRedaction[],
) {
  const bytes = new TextEncoder().encode(text),
    decoder = new TextDecoder("utf-8", { fatal: true });
  const edits = redactions
    .filter((entry) => entry.field === field)
    .toSorted((a, b) => a.evidence.start - b.evidence.start);
  let result = "",
    end = 0;
  for (const edit of edits) {
    const evidence = edit.evidence;
    if (
      evidence.start < end ||
      evidence.end <= evidence.start ||
      evidence.end > bytes.length ||
      decoder.decode(bytes.slice(evidence.start, evidence.end)) !==
        evidence.quote
    )
      throw new Error("Seleção sobreposta ou diferente do snapshot.");
    result +=
      decoder.decode(bytes.slice(end, evidence.start)) + edit.replacement;
    end = evidence.end;
  }
  return result + decoder.decode(bytes.slice(end));
}

export function admissionBody(
  requestId: string,
  item: ImportItem,
  form: AdmissionForm,
  redactions: ImportRedaction[],
) {
  const parsed = admissionFormSchema.parse(form),
    real = item.input.origin === "real";
  if (
    real &&
    (!parsed.consent_receipt.trim() ||
      !z.iso.datetime({ offset: true }).safeParse(parsed.consent_confirmed_at)
        .success ||
      parsed.privacy_policy_revision === 0)
  )
    throw new Error(
      "Caso real exige política configurada, recibo e data de autorização.",
    );
  if (!real && !/^synthetic:.+/.test(parsed.dataset_key))
    throw new Error(
      "Identifique o dataset sintético com o prefixo synthetic:.",
    );
  if (item.input.source_kind !== "manual_import")
    throw new Error(
      "Esta origem exige verificação do vínculo da intimação antes da admissão.",
    );
  return {
    request_id: requestId,
    import_item_id: item.id,
    expected_batch_revision: parsed.expected_batch_revision,
    intimation_id: null,
    matter_key: parsed.matter_key,
    legal_date: parsed.legal_date,
    knowledge_as_of: parsed.knowledge_as_of,
    reviewed_at: parsed.reviewed_at,
    dataset_key: real ? null : parsed.dataset_key,
    privacy_policy_revision: real ? parsed.privacy_policy_revision : 0,
    consent_receipt: real ? parsed.consent_receipt : "",
    consent_confirmed_at: real ? parsed.consent_confirmed_at : "",
    sanitization: {
      version: "intimation-redaction-v1",
      source_digest: item.snapshot_digest,
      meaning_status: parsed.meaning_status,
      privacy_reviewed: parsed.privacy_reviewed,
      review_receipt: parsed.review_receipt,
      purposes: (["evaluation", "training", "rag"] as const).filter(
        (purpose) => parsed[purpose],
      ),
      redactions,
    },
  };
}
export function admitImportedCase(
  api: ApiFetcher,
  body: ReturnType<typeof admissionBody>,
) {
  return api<{ data: ImportedCaseResult }>(
    "/v1/curation/intimation-admissions",
    { method: "POST", body },
  ).then((response) => response.data);
}
