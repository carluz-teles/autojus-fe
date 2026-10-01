import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type {
  AnnotationEditorInput,
  AnnotationPage,
} from "./annotation-assignments";
import {
  annotationDraftSchema,
  annotationForSubmission,
} from "./annotation-form";
import {
  annotationSchemaForTask,
  type IntimationAnnotation,
} from "./annotation-schema";
import type { SamplingSplit } from "./sampling";

export interface DecisionAssessment {
  policy_version: string;
  ready: boolean;
  required_reviews: number;
  qualified_reviews: number;
  independent_reviews: number;
  critical: boolean;
  differences: string[];
  blockers: string[];
}
export interface DecisionReview {
  submission_id: string;
  person_id: string;
  mode: "assisted" | "blind";
  digest: string;
  qualified: boolean;
  grant_reference: string | null;
  independent: boolean;
  annotation: IntimationAnnotation;
}
export interface CriticalAlert {
  id: string;
  task_id: string;
  reason: string;
  recorded_at: string;
  idempotent_replay: boolean;
}
export interface DecisionPreview extends AnnotationEditorInput {
  task_id: string;
  group_source_ids: string[];
  origin: "real" | "synthetic";
  split: SamplingSplit;
  revision: number;
  previous_decision_id: string | null;
  input_digest: string;
  reviews: DecisionReview[];
  alerts: CriticalAlert[];
  assessment: DecisionAssessment;
  source_purposes: string[];
}
export interface DecisionQueueItem {
  task_id: string;
  batch_id: string;
  mode: "assisted" | "blind";
  split: SamplingSplit;
  frame_valid: boolean;
  submitted_reviews: number;
  critical_alerts: number;
  latest_decision_id: string | null;
}
export type DecisionOutcome =
  "accepted" | "corrected" | "insufficient" | "rejected";
export interface AnnotationDecision {
  id: string;
  task_id: string;
  revision: number;
  previous_decision_id: string | null;
  input_digest: string;
  outcome: DecisionOutcome;
  annotation: IntimationAnnotation | null;
  annotation_digest: string | null;
  reason: string;
  origin: string;
  quality: string;
  purposes: string[];
  assessment: DecisionAssessment;
  submission_ids: string[];
  evidence: { reviews: DecisionReview[]; alerts: CriticalAlert[] };
  recorded_at: string;
  current: boolean;
  inputs_current: boolean;
  frame_valid: boolean;
  authority_current: boolean;
  idempotent_replay: boolean;
}
export interface DecisionCommand {
  request_id: string;
  previous_decision_id: string | null;
  expected_revision: number;
  expected_input_digest: string;
  submission_ids: string[];
  outcome: DecisionOutcome;
  annotation: IntimationAnnotation | null;
  reason: string;
}
const reasonSchema = z
  .string()
  .trim()
  .min(1, "Justifique sua decisão.")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 8000,
    "A justificativa excede 8 mil bytes.",
  );
export const decisionFormSchema = z.strictObject({
  outcome: z.enum(["", "accepted", "corrected", "insufficient", "rejected"]),
  selected: z.string(),
  reason: reasonSchema,
});
export const criticalAlertSchema = z.strictObject({ reason: reasonSchema });
export type DecisionFormValues = z.infer<typeof decisionFormSchema>;
export const decisionKeys = {
  all: ["curation", "decisions"] as const,
  input: (id: string) => ["curation", "decisions", "input", id] as const,
  receipt: (id: string) => ["curation", "decisions", "receipt", id] as const,
};
const root = "/v1/curation";
const taskPath = (task: string) =>
  `${root}/annotation-tasks/${encodeURIComponent(task)}`;
export function listDecisionQueue(
  api: ApiFetcher,
  state: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({ state, limit: "20" });
  if (cursor) query.set("cursor", cursor);
  return api<AnnotationPage<DecisionQueueItem>>(
    `${root}/annotation-decision-queue?${query}`,
    { signal },
  );
}
export async function getDecisionInput(
  api: ApiFetcher,
  task: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: DecisionPreview }>(
    `${taskPath(task)}/decision-input`,
    { signal },
  );
  if (
    data.task_id !== task ||
    !/^[a-f0-9]{64}$/.test(data.snapshot_digest) ||
    !/^[a-f0-9]{64}$/.test(data.input_digest) ||
    data.reviews.length > 3 ||
    new Set(data.reviews.map((r) => r.submission_id)).size !==
      data.reviews.length ||
    data.prediction !== undefined ||
    data.assignment !== undefined
  )
    throw new Error(
      "A comparação recebida não corresponde à tarefa autorizada.",
    );
  const schema = annotationSchemaForTask(
    data.snapshot.facts.text,
    data.snapshot_digest,
    data.protocol.contract,
  );
  for (const review of data.reviews) schema.parse(review.annotation);
  return data;
}
export async function getDecision(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: AnnotationDecision }>(
    `${root}/annotation-decisions/${encodeURIComponent(id)}`,
    { signal },
  );
  if (data.id !== id)
    throw new Error("O recibo recebido não corresponde à decisão solicitada.");
  return data;
}
export async function postDecision(
  api: ApiFetcher,
  task: string,
  body: DecisionCommand,
) {
  const { data } = await api<{ data: AnnotationDecision }>(
    `${taskPath(task)}/decisions`,
    { method: "POST", body },
  );
  if (
    data.task_id !== task ||
    data.input_digest !== body.expected_input_digest ||
    data.revision !== body.expected_revision + 1
  )
    throw new Error(
      "O resultado não corresponde ao envio. Recupere o mesmo comando.",
    );
  return data;
}
export async function postCriticalAlert(
  api: ApiFetcher,
  task: string,
  body: { request_id: string; reason: string },
) {
  const { data } = await api<{ data: CriticalAlert }>(
    `${taskPath(task)}/critical-alerts`,
    { method: "POST", body },
  );
  if (data.task_id !== task)
    throw new Error(
      "O alerta recebido não corresponde à tarefa. Recupere o envio.",
    );
  return data;
}
export function decisionCommand(
  input: DecisionPreview,
  raw: DecisionFormValues,
  edited: unknown,
  request: string,
): DecisionCommand {
  const meta = decisionFormSchema.parse(raw);
  if (!input.assessment.ready)
    throw new Error("As revisões obrigatórias ainda não permitem decidir.");
  if (!meta.outcome) throw new Error("Escolha o resultado da decisão.");
  let annotation: IntimationAnnotation | null = null;
  if (meta.outcome !== "rejected") {
    if (meta.outcome === "accepted") {
      annotation = annotationSchemaForTask(
        input.snapshot.facts.text,
        input.snapshot_digest,
        input.protocol.contract,
      ).parse(
        input.reviews.find((r) => r.submission_id === meta.selected)
          ?.annotation,
      );
    } else {
      const validated = annotationForSubmission(
        annotationDraftSchema.parse(edited),
        input,
      );
      if (!validated.success) throw validated.error;
      annotation = validated.data;
    }
    if (
      (meta.outcome === "insufficient") !==
      (annotation.label.answerability === "insufficient")
    )
      throw new Error(
        "Para contexto insuficiente, use o resultado ‘Contexto insuficiente’; nos demais, defina a resposta determinada ou parcial.",
      );
  }
  return {
    request_id: request,
    previous_decision_id: input.previous_decision_id,
    expected_revision: input.revision,
    expected_input_digest: input.input_digest,
    submission_ids: input.reviews.map((r) => r.submission_id),
    outcome: meta.outcome,
    annotation,
    reason: meta.reason,
  };
}
export function decisionInputVersion(input: DecisionPreview) {
  return `${input.input_digest}:${input.revision}:${input.previous_decision_id ?? ""}`;
}
export const decisionOutcomeLabels: Record<DecisionOutcome, string> = {
  accepted: "Aceitar uma resposta submetida",
  corrected: "Registrar resposta corrigida",
  insufficient: "Contexto insuficiente",
  rejected: "Rejeitar o exemplo",
};
export function decisionBlockerLabel(code: string) {
  return (
    (
      {
        duplicate_person: "As respostas precisam vir de pessoas diferentes.",
        reviewer_not_qualified: "Há revisor sem habilitação ativa.",
        reviews_pending: "Faltam revisões qualificadas.",
        independent_review_pending: "Falta revisão independente.",
        blind_control_reviews_pending:
          "Faltam respostas cegas independentes para o controle.",
        conflict_judge_is_contributor:
          "O conflito precisa ser decidido por alguém que não participou das respostas.",
      } as Record<string, string>
    )[code] ?? code
  );
}
export function decisionDifferenceLabel(path: string) {
  const fields: Record<string, string> = {
    label: "Resposta",
    acts: "Atos",
    deadline: "Prazo",
    act_type: "Tipo do ato",
    quantity: "Quantidade",
    unit: "Unidade",
    evidence: "Evidência",
    quote: "Trecho",
    recipient: "Destinatário",
    actionability: "Natureza",
    reason: "Justificativa",
    answerability: "Determinação",
    abstention_reason: "Motivo da abstenção",
    missing_context: "Contexto ausente",
    due_date: "Data final",
    kind: "Origem do prazo",
  };
  return (
    path
      .split("/")
      .filter(Boolean)
      .map((p) => fields[p] ?? (/^\d+$/.test(p) ? String(Number(p) + 1) : p))
      .join(" → ") || "Resposta inteira"
  );
}
