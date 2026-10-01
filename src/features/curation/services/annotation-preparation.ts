import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  AnnotationAssignmentInput,
  AnnotationBatchSummary,
  AnnotationPage,
} from "./annotation-assignments";
import type { SamplingFrame, SamplingSplit } from "./sampling";

export interface AnnotationActOption {
  key: string;
  label: string;
}
export interface ProtocolSummary {
  id: string;
  key: string;
  revision: number;
  origin: "real" | "synthetic";
  matter_key: string;
  digest: string;
  recorded_at: string;
}
export interface AnnotationProtocol extends ProtocolSummary {
  previous_revision_id: string | null;
  definition: AnnotationAssignmentInput["protocol"];
  author_person_id: string;
  idempotent_replay: boolean;
}
export interface PreparedTask {
  id: string;
  source_link_id: string;
  case_version_id: string;
  snapshot_digest: string;
  source_digest: string;
  sanitized_digest: string;
  split: SamplingSplit;
  mode: "blind" | "assisted";
}
export interface PreparedBatch extends AnnotationBatchSummary {
  tasks: PreparedTask[];
  idempotent_replay: boolean;
}
export interface LocalPredictionCommand {
  task: string;
  body: {
    request_id: string;
    engine_version: "snapshot-rules-v1";
    expected_protocol_digest: string;
    expected_snapshot_digest: string;
  };
}
export interface LocalPredictionReceipt {
  id: string;
  task_id: string;
  attempt: number;
  state: "completed" | "failed";
  error_code: string | null;
  engine_version: string;
  http_calls: number;
  recorded_at: string;
  idempotent_replay: boolean;
}
const bytes = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Preencha este campo.")
    .refine(
      (v) => new TextEncoder().encode(v).length <= max,
      `Limite de ${max} bytes.`,
    );
const ruleSchema = z.strictObject({
  reference: bytes(200),
  quantity: z.number().int().positive(),
  unit: z.enum([
    "business_days",
    "calendar_days",
    "hours",
    "minutes",
    "months",
    "years",
  ]),
  anchor_event: bytes(200),
  start_rule: bytes(200),
  citation: bytes(2000),
  source_reference: bytes(2000),
  review_note: bytes(4000),
});
export const protocolFormSchema = z
  .strictObject({
    key: bytes(128),
    origin: z.enum(["", "real", "synthetic"]),
    matter_key: bytes(200),
    act_types: z
      .array(z.string())
      .min(1, "Escolha pelo menos um tipo de ato.")
      .max(128),
    rubric: bytes(64000),
    ordinary_reviews: z.number().int().min(1).max(2),
    rules: z.array(ruleSchema).max(256),
    review_reference: bytes(2000),
    reviewed_at: z.iso.datetime({
      offset: true,
      message: "Informe data/hora ISO com fuso.",
    }),
    reason: bytes(2000),
    confirmed: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.origin)
      ctx.addIssue({
        code: "custom",
        path: ["origin"],
        message: "Escolha a origem.",
      });
    if (!v.confirmed)
      ctx.addIssue({
        code: "custom",
        path: ["confirmed"],
        message: "Confirme a conferência do protocolo.",
      });
    if (
      (v.origin === "synthetic") !==
      v.review_reference.startsWith("synthetic:")
    )
      ctx.addIssue({
        code: "custom",
        path: ["review_reference"],
        message:
          "Revisões sintéticas usam synthetic:; referências reais não usam esse prefixo.",
      });
    if (new Set(v.act_types).size !== v.act_types.length)
      ctx.addIssue({
        code: "custom",
        path: ["act_types"],
        message: "Tipos de ato repetidos.",
      });
    const seen = new Set<string>();
    v.rules.forEach((rule, i) => {
      if (seen.has(rule.reference))
        ctx.addIssue({
          code: "custom",
          path: ["rules", i, "reference"],
          message: "Identificador de regra repetido.",
        });
      seen.add(rule.reference);
    });
  });
export type ProtocolForm = z.infer<typeof protocolFormSchema>;
export function protocolDefaults(
  previous?: AnnotationProtocol | null,
): ProtocolForm {
  return {
    key: previous?.key ?? "",
    origin: previous?.origin ?? "",
    matter_key: previous?.matter_key ?? "",
    act_types: previous?.definition.contract.act_types ?? [],
    rubric: previous?.definition.rubric ?? "",
    ordinary_reviews: previous?.definition.review_policy.ordinary_reviews ?? 1,
    rules: Object.entries(previous?.definition.contract.legal_rules ?? {}).map(
      ([reference, rule]) =>
        ruleSchema.parse({
          reference,
          ...rule,
          ...previous!.definition.rule_sources[reference],
        }),
    ),
    review_reference: "",
    reviewed_at: "",
    reason: "",
    confirmed: false,
  };
}
export function emptyProtocolRule(): ProtocolForm["rules"][number] {
  return {
    reference: "",
    quantity: 0,
    unit: "business_days",
    anchor_event: "",
    start_rule: "",
    citation: "",
    source_reference: "",
    review_note: "",
  };
}
export function protocolBody(
  raw: ProtocolForm,
  previous: AnnotationProtocol | null,
  catalog: AnnotationActOption[],
  author: boolean,
  request: string,
) {
  const form = protocolFormSchema.parse(raw);
  if (Date.parse(form.reviewed_at) > Date.now())
    throw new Error("A data de revisão não pode estar no futuro.");
  if (form.origin === "real" && !author)
    throw new Error(
      "Protocolo real exige permissão de autoria jurídica e habilitação na matéria.",
    );
  if (
    previous &&
    (previous.key !== form.key ||
      previous.origin !== form.origin ||
      previous.matter_key !== form.matter_key)
  )
    throw new Error("Chave, origem e matéria permanecem fixas na linhagem.");
  if (
    form.act_types.some((key) => !catalog.some((option) => option.key === key))
  )
    throw new Error("Confira os tipos não disponíveis no catálogo atual.");
  return {
    request_id: request,
    previous_revision_id: previous?.id ?? null,
    key: form.key,
    origin: form.origin as "real" | "synthetic",
    matter_key: form.matter_key,
    act_types: form.act_types,
    rubric: form.rubric,
    review_policy: {
      ordinary_reviews: form.ordinary_reviews,
      conflict_reviews: 2,
      critical_reviews: 2,
    },
    review_reference: form.review_reference,
    reviewed_at: form.reviewed_at,
    reason: form.reason,
    legal_rules: Object.fromEntries(
      form.rules.map(
        ({ reference, quantity, unit, anchor_event, start_rule }) => [
          reference,
          { quantity, unit, anchor_event, start_rule },
        ],
      ),
    ),
    rule_sources: Object.fromEntries(
      form.rules.map(
        ({ reference, citation, source_reference, review_note }) => [
          reference,
          { citation, source_reference, review_note },
        ],
      ),
    ),
  };
}
export const batchFormSchema = z.strictObject({
  frame: z.string().min(1),
  protocol: z.string().min(1),
  confirmed: z.boolean(),
});
export function batchBody(
  values: z.infer<typeof batchFormSchema>,
  frame: SamplingFrame | undefined,
  protocol: AnnotationProtocol | undefined,
  request: string,
) {
  const form = batchFormSchema.parse(values);
  if (
    !form.confirmed ||
    !frame?.valid ||
    frame.id !== form.frame ||
    protocol?.id !== form.protocol ||
    frame.plan.selected_count < 1
  )
    throw new Error(
      "Confira a amostra válida, o protocolo e confirme a preparação.",
    );
  if (
    frame.plan.population
      .filter((p) => p.selected)
      .some((p) => p.origin !== protocol.origin)
  )
    throw new Error(
      "Origem do protocolo incompatível com os casos selecionados.",
    );
  return {
    request_id: request,
    frame_id: frame.id,
    manifest_digest: frame.manifest_digest,
    protocol_id: protocol.id,
  };
}
export const preparationKeys = {
  all: ["curation", "preparation"] as const,
  protocol: (id: string) =>
    ["curation", "preparation", "protocol", id] as const,
  batch: (id: string) => ["curation", "preparation", "batch", id] as const,
};
const root = "/v1/curation",
  page = (cursor: string | null) =>
    `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
export async function getActCatalog(api: ApiFetcher, signal?: AbortSignal) {
  return (
    await api<{ data: AnnotationActOption[] }>(
      `${root}/annotation-act-catalog`,
      { signal },
    )
  ).data;
}
export function listProtocols(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<ProtocolSummary>>(
    `${root}/annotation-protocols?${page(cursor)}`,
    { signal },
  );
}
export async function getProtocol(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: AnnotationProtocol }>(
    `${root}/annotation-protocols/${encodeURIComponent(id)}`,
    { signal },
  );
  if (data.id !== id)
    throw new Error("Protocolo recebido não corresponde ao solicitado.");
  return data;
}
export async function createProtocol(
  api: ApiFetcher,
  body: ReturnType<typeof protocolBody>,
) {
  return (
    await api<{ data: AnnotationProtocol }>(`${root}/annotation-protocols`, {
      method: "POST",
      body,
    })
  ).data;
}
export function listPreparedBatches(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<AnnotationBatchSummary>>(
    `${root}/annotation-batches?${page(cursor)}`,
    { signal },
  );
}
export async function getPreparedBatch(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: PreparedBatch }>(
    `${root}/annotation-batches/${encodeURIComponent(id)}`,
    { signal },
  );
  if (data.id !== id)
    throw new Error("Lote recebido não corresponde ao solicitado.");
  return data;
}
export async function createPreparedBatch(
  api: ApiFetcher,
  body: ReturnType<typeof batchBody>,
) {
  return (
    await api<{ data: PreparedBatch }>(`${root}/annotation-batches`, {
      method: "POST",
      body,
    })
  ).data;
}
export async function prepareLocalPrediction(
  api: ApiFetcher,
  command: LocalPredictionCommand,
) {
  const { data } = await api<{ data: LocalPredictionReceipt }>(
    `${root}/annotation-tasks/${encodeURIComponent(command.task)}/snapshot-predictions`,
    { method: "POST", body: command.body },
  );
  if (
    data.task_id !== command.task ||
    data.engine_version !== "snapshot-rules-v1" ||
    data.http_calls !== 0
  )
    throw new Error(
      "O recibo não corresponde à preparação local. Recupere o envio.",
    );
  return data;
}
