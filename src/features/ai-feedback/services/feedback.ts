import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

const reasonSchema = z.enum([
  "",
  "incorrect",
  "incomplete",
  "irrelevant",
  "unclear",
  "other",
]);
function privateText(max: number) {
  return z
    .string()
    .refine(
      (value) =>
        !value.includes("\0") && new TextEncoder().encode(value).length <= max,
      `Texto inválido ou muito longo (limite de ${max} bytes).`,
    );
}
export const feedbackDetailsSchema = z.strictObject({
  reason_code: reasonSchema,
  comment: privateText(4096),
  correction: privateText(8192),
});
export type FeedbackDetails = z.infer<typeof feedbackDetailsSchema>;
export const emptyDetails: FeedbackDetails = {
  reason_code: "",
  comment: "",
  correction: "",
};
const fields = {
  result_id: z.uuid(),
  dimension: z.literal("usefulness"),
  revision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  status: z.enum(["absent", "active", "withdrawn"]),
  helpful: z.boolean().nullable(),
  reason_code: reasonSchema.optional(),
  comment: privateText(4096).optional(),
  correction: privateText(8192).optional(),
  updated_at: z.iso.datetime({ offset: true }).nullable(),
};
type StateFields = z.infer<z.ZodObject<typeof fields>>;
function validState(s: StateFields) {
  if (s.status === "absent")
    return (
      s.revision === 0 &&
      s.updated_at === null &&
      s.helpful === null &&
      !s.reason_code &&
      !s.comment &&
      !s.correction
    );
  if (s.revision < 1 || s.updated_at === null) return false;
  return s.status === "active"
    ? typeof s.helpful === "boolean"
    : s.helpful === null && !s.reason_code && !s.comment && !s.correction;
}
export const feedbackSchema = z
  .object(fields)
  .refine(validState, "Estado de feedback inconsistente.");
const receiptSchema = z
  .object({ ...fields, request_id: z.uuid(), replayed: z.boolean() })
  .refine(validState);
export type Feedback = z.infer<typeof feedbackSchema>;
export type FeedbackReceipt = z.infer<typeof receiptSchema>;
type Request = { request_id: string; expected_revision: number };
export type FeedbackCommand =
  | { action: "vote"; body: Request & FeedbackDetails & { helpful: boolean } }
  | { action: "withdraw"; body: Request };

function endpoint(result: string) {
  return `/v1/ai-results/${z.uuid().parse(result)}/feedback`;
}
export async function getFeedback(
  api: ApiFetcher,
  result: string,
  signal?: AbortSignal,
) {
  const response = await api<{ data: unknown }>(endpoint(result), { signal });
  const state = feedbackSchema.parse(response.data);
  if (state.result_id !== result)
    throw new Error("Feedback de outra resposta.");
  return state;
}

export async function recordFeedbackExposure(
  api: ApiFetcher,
  result: string,
  signal?: AbortSignal,
) {
  await api<void>(endpoint(result) + "/exposures", {
    method: "POST",
    body: {},
    signal,
  });
}
export async function sendFeedback(
  api: ApiFetcher,
  result: string,
  command: FeedbackCommand,
  signal?: AbortSignal,
) {
  const response = await api<{ data: unknown }>(
    endpoint(result) + (command.action === "withdraw" ? "/withdrawals" : ""),
    {
      method: command.action === "vote" ? "PUT" : "POST",
      body: command.body,
      signal,
    },
  );
  const receipt = receiptSchema.parse(response.data);
  if (
    receipt.result_id !== result ||
    receipt.request_id !== command.body.request_id ||
    receipt.revision !== command.body.expected_revision + 1 ||
    (command.action === "withdraw"
      ? receipt.status !== "withdrawn"
      : receipt.status !== "active" ||
        receipt.helpful !== command.body.helpful ||
        (receipt.reason_code ?? "") !== command.body.reason_code ||
        (receipt.comment ?? "") !== command.body.comment ||
        (receipt.correction ?? "") !== command.body.correction)
  ) {
    throw new Error("Não foi possível conferir a confirmação do feedback.");
  }
  return receipt;
}
