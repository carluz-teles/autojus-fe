import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import {
  type CandidateBody,
  type CandidateForm,
  parseCandidateForm,
} from "./candidate-form";
import {
  candidateSummarySchema,
  candidateViewSchema,
} from "./candidate-schemas";
import type { ComparisonDelivery } from "./comparison-schemas";

const root = "/curation";
export const candidateKeys = {
  all: ["curation", "type-candidates"] as const,
  detail: (id: string) => [...candidateKeys.all, "detail", id] as const,
  list: (id: string) => [...candidateKeys.all, "list", id] as const,
};
export type FreezeCandidateCommand = {
  comparison: string;
  body: CandidateBody & { request_id: string };
  expected: {
    release: string;
    origin: string;
    reportDigest: string;
    plan: string;
    mode: string;
    model: string;
    routeDigest: string;
  };
};
export function candidateCommand(
  delivery: ComparisonDelivery,
  form: CandidateForm,
  request: string,
): FreezeCandidateCommand | null {
  const parsed = parseCandidateForm(form, delivery);
  if (!parsed.body) return null;
  const c = delivery.document.comparison,
    source = c.sources.find(
      (s) => s.report_id === parsed.body!.candidate_report_id,
    )!;
  const ref = delivery.document.source_reports.find(
    (r) => r.report_id === source.report_id,
  )!;
  return {
    comparison: delivery.document.id,
    body: { ...parsed.body, request_id: request },
    expected: {
      release: c.release_id,
      origin: c.origin,
      reportDigest: ref.expected_digest,
      plan: source.plan_id,
      mode: source.pipeline.id,
      model: source.pipeline.model,
      routeDigest: source.pipeline.configuration_digest,
    },
  };
}
export async function freezeCandidate(
  api: ApiFetcher,
  command: FreezeCandidateCommand,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/type-comparisons/${encodeURIComponent(command.comparison)}/candidates`,
    { method: "POST", body: command.body },
  );
  const result = candidateViewSchema.parse(data),
    d = result.document,
    b = command.body,
    e = command.expected;
  if (
    result.request_id !== b.request_id ||
    d.comparison_id !== command.comparison ||
    d.comparison_digest !== b.expected_comparison_digest ||
    d.baseline_report_id !== b.baseline_report_id ||
    d.candidate_report_id !== b.candidate_report_id ||
    d.reason !== b.reason ||
    JSON.stringify(d.policy) !== JSON.stringify(b.policy) ||
    d.release_id !== e.release ||
    d.origin !== e.origin ||
    d.candidate_report_digest !== e.reportDigest ||
    d.plan_id !== e.plan ||
    d.route.mode !== e.mode ||
    d.route_digest !== e.routeDigest ||
    (d.route.policy?.model ?? "") !== e.model
  )
    throw new Error("Recupere o pedido para conferir o candidato recebido.");
  return result;
}
export async function getCandidate(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  const { data } = await api<{ data: unknown }>(
    `${root}/type-candidates/${encodeURIComponent(id)}`,
    { signal },
  );
  const result = candidateViewSchema.parse(data);
  if (result.document.id !== id)
    throw new Error("Candidato incompatível com a seleção.");
  return result;
}
export async function listCandidates(
  api: ApiFetcher,
  release: string,
  cursor: string | null,
  signal?: AbortSignal,
) {
  const raw = await api<unknown>(
    `${root}/dataset-releases/${encodeURIComponent(release)}/type-candidates`,
    { query: { limit: 20, ...(cursor ? { cursor } : {}) }, signal },
  );
  const page = z
    .strictObject({
      data: z.array(candidateSummarySchema).max(20),
      page: z.strictObject({
        next_cursor: z.uuid().nullable(),
        limit: z.int().min(1).max(20),
      }),
    })
    .parse(raw);
  if (page.data.some((c) => c.release_id !== release))
    throw new Error("Histórico de candidatos incompatível com o dataset.");
  return page;
}
