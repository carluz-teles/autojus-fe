import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type { AnnotationPage } from "./annotation-assignments";
import type { DecisionOutcome } from "./annotation-decisions";
import type { SamplingSplit } from "./sampling";

export interface GoldCandidate {
  task_id: string;
  batch_id: string;
  decision_id: string;
  decision_revision: number;
  outcome: DecisionOutcome;
  origin: "real" | "synthetic";
  quality: string;
  split: SamplingSplit;
  recorded_at: string;
  latest_gold_id: string | null;
}
export interface GoldPreview {
  decision_id: string;
  task_id: string;
  source_link_id: string;
  revision: number;
  previous_revision_id: string | null;
  origin: "real" | "synthetic";
  quality: string;
  split: SamplingSplit;
  legal_date: string;
  purposes: string[];
  policy_version: string;
  eligible: boolean;
  blockers: string[];
}
export interface GoldRevision extends Omit<
  GoldPreview,
  "legal_date" | "policy_version"
> {
  id: string;
  legal_valid_from: string;
  legal_valid_until: string | null;
  content_digest: string;
  reason: string;
  recorded_at: string;
  idempotent_replay: boolean;
}
export interface WithdrawalReceipt {
  id: string;
  gold_id: string | null;
  source_link_id: string | null;
  privacy_policy_revision: number | null;
  reason: string;
  recorded_at: string;
  idempotent_replay: boolean;
}
export const goldKeys = {
  all: ["curation", "gold"] as const,
  preview: (id: string) => ["curation", "gold", "preview", id] as const,
  revision: (id: string) => ["curation", "gold", "revision", id] as const,
};
const reason = z
  .string()
  .trim()
  .min(1, "Informe o motivo.")
  .refine(
    (v) => new TextEncoder().encode(v).length <= 8000,
    "Motivo excede 8 mil bytes.",
  );
export const goldFormSchema = z.strictObject({
  purposes: z.array(z.string()).min(1, "Escolha uma finalidade.").max(3),
  legal_valid_from: z.iso.date("Informe uma data de início válida."),
  legal_valid_until: z.union([
    z.literal(""),
    z.iso.date("Informe uma data de fim válida."),
  ]),
  reason,
  confirmed: z.boolean(),
  preview_reference: z.string(),
});
export type GoldFormValues = z.infer<typeof goldFormSchema>;
export const withdrawalSchema = z.strictObject({
  reason,
  confirmed: z.boolean().refine(Boolean, "Confirme a retirada permanente."),
});
export type WithdrawalValues = z.infer<typeof withdrawalSchema>;
export function goldPreviewReference(p: GoldPreview) {
  return JSON.stringify(p);
}
export function goldBody(raw: GoldFormValues, p: GoldPreview, request: string) {
  const f = goldFormSchema.parse(raw);
  if (
    !p.eligible ||
    !f.confirmed ||
    f.preview_reference !== goldPreviewReference(p)
  )
    throw new Error(
      "Confira a elegibilidade atual e confirme novamente a promoção.",
    );
  if (
    new Set(f.purposes).size !== f.purposes.length ||
    f.purposes.some((v) => !p.purposes.includes(v))
  )
    throw new Error("Finalidade não permitida ou repetida.");
  if (
    f.legal_valid_from > p.legal_date ||
    (f.legal_valid_until &&
      (f.legal_valid_until < p.legal_date ||
        f.legal_valid_until < f.legal_valid_from))
  )
    throw new Error("A vigência jurídica deve conter a data do caso.");
  return {
    request_id: request,
    decision_id: p.decision_id,
    previous_revision_id: p.previous_revision_id,
    expected_revision: p.revision,
    purposes: f.purposes,
    legal_valid_from: f.legal_valid_from,
    legal_valid_until: f.legal_valid_until || null,
    reason: f.reason,
  };
}
const root = "/v1/curation";
export function listGoldCandidates(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<GoldCandidate>>(
    `${root}/gold-candidates?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { signal },
  );
}
export async function getGoldPreview(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: GoldPreview }>(
    `${root}/annotation-decisions/${encodeURIComponent(id)}/gold-preview`,
    { signal },
  );
  if (data.decision_id !== id)
    throw new Error("Decisão recebida não corresponde à solicitada.");
  return data;
}
export async function getGoldRevision(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: GoldRevision }>(
    `${root}/gold-revisions/${encodeURIComponent(id)}`,
    { signal },
  );
  if (data.id !== id)
    throw new Error("Revisão recebida não corresponde à solicitada.");
  return data;
}
export async function promoteGold(
  api: ApiFetcher,
  body: ReturnType<typeof goldBody>,
) {
  const { data } = await api<{ data: GoldRevision }>(`${root}/gold-revisions`, {
    method: "POST",
    body,
  });
  if (
    data.decision_id !== body.decision_id ||
    data.previous_revision_id !== body.previous_revision_id ||
    data.revision !== body.expected_revision + 1
  )
    throw new Error("Confira o recibo recuperando o mesmo envio.");
  return data;
}
export async function withdrawGold(
  api: ApiFetcher,
  command: { id: string; body: { request_id: string; reason: string } },
) {
  const { data } = await api<{ data: WithdrawalReceipt }>(
    `${root}/gold-revisions/${encodeURIComponent(command.id)}/withdrawals`,
    { method: "POST", body: command.body },
  );
  if (data.gold_id !== command.id)
    throw new Error("Confira o recibo recuperando o mesmo envio.");
  return data;
}
export function goldBlockerLabel(code: string) {
  return (
    (
      {
        gold_missing: "A tarefa ainda não tem gold publicado.",
        purpose_not_permitted: "Finalidade não autorizada para este item.",
        holdout_not_for_learning: "Controle reservado para avaliação.",
        release_withdrawn: "O dataset foi retirado.",
        publisher_revoked: "O acesso do publicador foi revogado.",
        artifact_cleanup_pending: "A retirada dos arquivos está pendente.",
        artifact_cleanup_complete:
          "Os arquivos desta publicação foram retirados.",
        decision_superseded: "A decisão foi substituída.",
        decision_inputs_changed:
          "As respostas ou os alertas mudaram após a decisão.",
        decision_authority_changed: "A habilitação dos responsáveis mudou.",
        sampling_frame_invalid: "A amostra foi invalidada.",
        decision_rejected: "O exemplo foi rejeitado.",
        no_permitted_purpose: "Não há finalidade autorizada.",
        withdrawn_decision_requires_new_review:
          "Gold desta decisão foi retirado. Uma nova decisão jurídica é necessária.",
        source_withdrawn: "A origem ou um caso relacionado foi retirado.",
        privacy_policy_inactive: "A política de privacidade não está ativa.",
        privacy_policy_withdrawn: "A política de privacidade foi retirada.",
        protocol_authority_changed:
          "A habilitação do autor do protocolo mudou.",
        gold_superseded: "Esta revisão gold foi substituída.",
        gold_withdrawn: "Esta revisão gold foi retirada.",
      } as Record<string, string>
    )[code] ?? code
  );
}
export function purposeLabel(value: string) {
  return (
    (
      {
        evaluation: "Avaliação",
        training: "Treinamento",
        rag: "RAG vetorial",
      } as Record<string, string>
    )[value] ?? value
  );
}
export function goldError(error: unknown) {
  return error instanceof z.ZodError
    ? error.issues.map((i) => i.message).join(" · ")
    : error instanceof Error
      ? error.message
      : "Não foi possível concluir.";
}
