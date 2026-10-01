import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type { AnnotationPage } from "./annotation-assignments";
import { type WithdrawalReceipt, withdrawalSchema } from "./annotation-gold";
export type WithdrawalScope = "source" | "privacy_policy";
export interface WithdrawalSource {
  id: string;
  origin: string;
  source_kind: string;
  matter_key: string;
  legal_date: string;
  recorded_at: string;
  privacy_policy_revision: number | null;
  withdrawn: boolean;
}
export interface WithdrawalPolicy {
  revision: number;
  active: boolean;
  configured_at: string;
  source_count: number;
  withdrawn: boolean;
}
export interface WithdrawalImpact {
  scope: WithdrawalScope;
  target: string;
  digest: string;
  affected_sources: number;
  gold_revisions: number;
  releases: number;
  publications: number;
  already_withdrawn: boolean;
  group_withdrawn: boolean;
  policy_active: boolean | null;
  withdrawal: WithdrawalReceipt | null;
}
export const scopedWithdrawalSchema = withdrawalSchema.extend({
  preview_digest: z.string(),
});
export type ScopedWithdrawalForm = z.infer<typeof scopedWithdrawalSchema>;
export function scopedWithdrawalBody(
  raw: ScopedWithdrawalForm,
  impact: WithdrawalImpact,
  request: string,
) {
  const form = scopedWithdrawalSchema.parse(raw);
  if (impact.already_withdrawn || form.preview_digest !== impact.digest)
    throw new Error(
      "O impacto mudou ou a retirada já foi registrada. Atualize e confirme novamente.",
    );
  return {
    scope: impact.scope,
    target: impact.target,
    body: {
      request_id: request,
      reason: form.reason,
      expected_impact_digest: form.preview_digest,
    },
  };
}
export const withdrawalKeys = {
  all: ["curation", "withdrawals"] as const,
  impact: (scope: string, target: string) =>
    ["curation", "withdrawals", scope, target] as const,
};
const root = "/v1/curation",
  page = (cursor: string | null) =>
    `limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
export function listWithdrawalSources(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<AnnotationPage<WithdrawalSource>>(
    `${root}/withdrawal-sources?${page(cursor)}`,
    { signal },
  );
}
export async function listWithdrawalPolicies(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const result = await api<AnnotationPage<WithdrawalPolicy>>(
    `${root}/withdrawal-policies?${page(cursor)}`,
    { signal },
  );
  if (
    result.data.some((p) => !Number.isSafeInteger(p.revision) || p.revision < 1)
  )
    throw new Error("Revisão de política inválida.");
  return result;
}
function targetPath(scope: WithdrawalScope, target: string) {
  return `${root}/${scope === "source" ? "intimation-sources" : "privacy-policies"}/${encodeURIComponent(target)}`;
}
export async function getWithdrawalImpact(
  api: ApiFetcher,
  scope: WithdrawalScope,
  target: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: WithdrawalImpact }>(
    `${targetPath(scope, target)}/withdrawal-preview`,
    { signal },
  );
  if (data.scope !== scope || data.target !== target)
    throw new Error("A prévia não corresponde ao alvo da retirada.");
  return data;
}
export async function withdrawScope(
  api: ApiFetcher,
  command: ReturnType<typeof scopedWithdrawalBody>,
) {
  const { data } = await api<{ data: WithdrawalReceipt }>(
    `${targetPath(command.scope, command.target)}/withdrawals`,
    { method: "POST", body: command.body },
  );
  if (
    (command.scope === "source" && data.source_link_id !== command.target) ||
    (command.scope === "privacy_policy" &&
      String(data.privacy_policy_revision) !== command.target)
  )
    throw new Error("Recupere o envio para conferir o recibo.");
  return data;
}
