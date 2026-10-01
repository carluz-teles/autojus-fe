import type { ApiFetcher } from "@/lib/api/use-api";

import {
  type AnnotationContract,
  annotationSchemaForTask,
  type IntimationAnnotation,
} from "./annotation-schema";
import type { ImportContext } from "./imports";
import type { SamplingSplit } from "./sampling";

export interface AnnotationBatchSummary {
  id: string;
  frame_id: string;
  protocol_id: string;
  task_kind: string;
  task_count: number;
  valid: boolean;
  recorded_at: string;
}
export interface AnnotationQueueItem {
  id: string;
  batch_id: string;
  mode: "assisted" | "blind";
  split: SamplingSplit;
  snapshot_digest: string;
  protocol_id: string;
  protocol_digest: string;
  slot_available: boolean;
  prediction_ready: boolean;
}
export interface AnnotationAssignment {
  id: string;
  task_id: string;
  slot: number;
  mode: "assisted" | "blind";
  prediction_id: string | null;
  state: "active" | "expired" | "released" | "submitted";
  revision: number;
  lease_until: string;
  created_at: string;
  valid: boolean;
}
export interface AnnotationDraft {
  assignment_id: string;
  revision: number;
  annotation: unknown;
  updated_at: string | null;
}
export interface AnnotationSubmissionReceipt {
  id: string;
  assignment_id: string;
  digest: string;
  blind_eligible: boolean;
  submitted_at: string;
}
export interface AnnotationAssignmentDetail {
  assignment: AnnotationAssignment;
  batch_id: string;
  submission?: AnnotationSubmissionReceipt;
}
export interface AnnotationCommandResult {
  assignment: AnnotationAssignment;
  draft?: Omit<AnnotationDraft, "annotation">;
  submission?: AnnotationSubmissionReceipt;
  idempotent_replay: boolean;
}
export interface AnnotationSubmissionView extends AnnotationSubmissionReceipt {
  annotation: IntimationAnnotation;
  valid: boolean;
}
export interface SnapshotDeadlineCue {
  quantity: number;
  unit: "" | "business_days" | "calendar_days";
  quote: string;
  start: number;
  end: number;
  exact_source_span: boolean;
}
export interface AssignmentPrediction {
  id: string;
  engine_version: string;
  suggestion: {
    annotation?: IntimationAnnotation;
    act_type: string;
    motor_actionability: string;
    origin: string;
    type_requires_review: boolean;
    interest_requires_review: boolean;
    procedure_override: string;
    type_in_catalog: boolean;
    deadline_cues: SnapshotDeadlineCue[];
  };
}
export interface AnnotationAssignmentInput {
  assignment: AnnotationAssignment;
  snapshot: {
    facts: { text: string; context: ImportContext };
    case_version_id: string;
    legal_date: string;
    knowledge_as_of: string;
    protocol_id: string;
    protocol_digest: string;
  };
  snapshot_digest: string;
  protocol: {
    act_type_labels?: Record<string, string>;
    task_kind: string;
    contract: AnnotationContract;
    rule_sources: Record<
      string,
      { citation: string; source_reference: string; review_note: string }
    >;
    rubric: string;
    review_policy: {
      ordinary_reviews: number;
      conflict_reviews: number;
      critical_reviews: number;
    };
    review_reference: string;
    reviewed_at: string;
    grant_reference: string | null;
    reason: string;
  };
  draft: AnnotationDraft;
  prediction?: AssignmentPrediction;
}
// Shared legal-answer editor context; decision correction has no assignment or prediction.
export type AnnotationEditorInput = Pick<
  AnnotationAssignmentInput,
  "snapshot" | "snapshot_digest" | "protocol"
> & {
  assignment?: Pick<AnnotationAssignment, "mode">;
  prediction?: AssignmentPrediction;
  draft?: Pick<AnnotationDraft, "annotation">;
};
export interface AnnotationPage<T> {
  data: T[];
  page: { next_cursor: string | null; limit: number };
}
export interface AnnotationLeaseCommand {
  request_id: string;
  expected_revision: number;
}
export interface AnnotationWriteCommand extends AnnotationLeaseCommand {
  expected_draft_revision: number;
  annotation: unknown;
}
export type AnnotationCommand =
  | { action: "draft" | "submissions"; body: AnnotationWriteCommand }
  | { action: "renewals" | "releases"; body: AnnotationLeaseCommand };

export const annotationKeys = {
  all: ["curation", "annotations"] as const,
  detail: (id: string) => ["curation", "annotations", "detail", id] as const,
  input: (id: string) => ["curation", "annotations", "input", id] as const,
  draft: (id: string) => ["curation", "annotations", "draft", id] as const,
};
const root = "/v1/curation";
const assignmentPath = (id: string) =>
  `${root}/annotation-assignments/${encodeURIComponent(id)}`;
const pagination = (cursor: string | null) =>
  `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

export function listAnnotationBatches(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<AnnotationBatchSummary>>(
    `${root}/annotation-queue/batches?${pagination(cursor)}`,
    { signal },
  );
}
export function listAnnotationQueue(
  api: ApiFetcher,
  batch: string,
  slot: number,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<AnnotationQueueItem>>(
    `${root}/annotation-queue/${encodeURIComponent(batch)}?slot=${slot}&${pagination(cursor)}`,
    { signal },
  );
}
export function listAnnotationAssignments(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<AnnotationAssignment>>(
    `${root}/annotation-assignments?${pagination(cursor)}`,
    { signal },
  );
}
export async function claimAnnotation(
  api: ApiFetcher,
  task: string,
  body: { request_id: string; slot: number },
) {
  return (
    await api<{ data: AnnotationCommandResult }>(
      `${root}/annotation-tasks/${encodeURIComponent(task)}/assignments`,
      { method: "POST", body },
    )
  ).data;
}
export async function getAnnotationAssignment(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return (
    await api<{ data: AnnotationAssignmentDetail }>(assignmentPath(id), {
      signal,
    })
  ).data;
}
export async function getAnnotationInput(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: AnnotationAssignmentInput }>(
    `${assignmentPath(id)}/input`,
    { signal },
  );
  // Never make unexpected suggestion data available to the blind UI, even if
  // a server/proxy regression returns a response for the wrong mode or task.
  if (
    data.assignment.id !== id ||
    !["assisted", "blind"].includes(data.assignment.mode) ||
    (data.assignment.mode === "assisted" &&
      (!data.prediction ||
        data.prediction.id !== data.assignment.prediction_id)) ||
    (data.assignment.mode === "blind" &&
      (data.prediction !== undefined || data.assignment.prediction_id !== null))
  )
    throw new Error(
      "O conteúdo recebido não corresponde à atribuição autorizada.",
    );
  const hypothesis = data.prediction?.suggestion.annotation;
  const inferred =
    data.prediction?.engine_version === "intimation-inference-v1";
  if (inferred !== !!hypothesis)
    throw new Error("A hipótese recebida não corresponde ao motor registrado.");
  if (hypothesis)
    annotationSchemaForTask(
      data.snapshot.facts.text,
      data.snapshot_digest,
      data.protocol.contract,
    ).parse(hypothesis);
  return data;
}
export async function getAnnotationDraft(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return (
    await api<{ data: AnnotationDraft }>(`${assignmentPath(id)}/draft`, {
      signal,
    })
  ).data;
}
export async function getAnnotationSubmission(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return (
    await api<{ data: AnnotationSubmissionView }>(
      `${root}/annotation-submissions/${encodeURIComponent(id)}`,
      { signal },
    )
  ).data;
}
export async function sendAnnotationCommand(
  api: ApiFetcher,
  id: string,
  command: AnnotationCommand,
) {
  return (
    await api<{ data: AnnotationCommandResult }>(
      `${assignmentPath(id)}/${command.action}`,
      {
        method: command.action === "draft" ? "PUT" : "POST",
        body: command.body,
      },
    )
  ).data;
}
export function assignmentStateLabel(state: AnnotationAssignment["state"]) {
  return {
    active: "Em revisão",
    expired: "Reserva vencida",
    released: "Devolvida à fila",
    submitted: "Resposta submetida",
  }[state];
}
export function assignmentWritable(
  assignment: AnnotationAssignment,
  now = Date.now(),
) {
  return (
    assignment.state === "active" &&
    assignment.valid &&
    Date.parse(assignment.lease_until) > now
  );
}
