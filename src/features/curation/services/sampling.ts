import { z } from "zod";

import type { ApiFetcher } from "@/lib/api/use-api";

import type { ImportInput } from "./imports";

export const samplingStrata = [
  { value: "resolved", label: "Resolvido pelo motor" },
  { value: "residual", label: "Resíduo do motor" },
  { value: "rare", label: "Classe rara" },
  { value: "insufficient_context", label: "Contexto insuficiente" },
] as const;
export type SamplingStratum = (typeof samplingStrata)[number]["value"];
export type SamplingSplit = "train" | "validation" | "test";
export const splitLabels: Record<SamplingSplit, string> = {
  train: "Treino",
  validation: "Validação",
  test: "Teste",
};
export interface SamplingSource {
  source_link_id: string;
  case_version_id: string;
  origin: "real" | "synthetic";
  matter_key: string;
  legal_date: string;
  knowledge_as_of: string;
  purposes: string[];
  reserved_split: SamplingSplit | null;
}
export interface SamplingPopulation {
  digest: string;
  sources: SamplingSource[];
}
export interface SamplingSourceFacts {
  id: string;
  version_id: string;
  matter_key: string;
  legal_date: string;
  facts: { text: string; context: ImportInput["context"] };
}
export interface SamplingItem {
  source_link_id: string;
  case_version_id: string;
  origin: string;
  text_digest: string;
  source_digest: string;
  group_key: string;
  stratum: SamplingStratum;
  stratum_reason: string;
  eligible: boolean;
  exclusion_reason: string;
  selected: boolean;
  split: SamplingSplit | "";
  mode: "blind" | "assisted" | "";
  inclusion_numerator: number;
  inclusion_denominator: number;
}
export interface SamplingConflict {
  group_key: string;
  members: string[];
  splits: SamplingSplit[];
}
export interface SamplingPlan {
  algorithm: string;
  seed: string;
  requested_count: number;
  selected_count: number;
  selected_groups: number;
  deficit: number;
  stratum_targets: Record<SamplingStratum, number>;
  stratum_counts: Record<SamplingStratum, number>;
  stratum_deficits: Record<SamplingStratum, number>;
  split_targets: Record<SamplingSplit, number>;
  split_counts: Record<SamplingSplit, number>;
  population: SamplingItem[];
  conflicts: SamplingConflict[];
}
export interface SamplingFrame {
  id: string;
  lineage_id: string;
  manifest_digest: string;
  frozen_at: string;
  valid: boolean;
  invalidations: SamplingConflict[];
  plan: SamplingPlan;
  idempotent_replay: boolean;
}
export interface SamplingSummary {
  id: string;
  lineage_id: string;
  lineage_key: string;
  manifest_digest: string;
  selected_count: number;
  frozen_at: string;
  valid: boolean;
}
export interface SamplingPage {
  data: SamplingSummary[];
  page: { next_cursor: string | null; limit: number };
}

export const samplingFormSchema = z.object({
  lineage_key: z
    .string()
    .trim()
    .min(1, "Identifique a linhagem do benchmark.")
    .max(200),
  seed: z.string().trim().min(1, "Informe a seed reproduzível.").max(200),
  origin: z
    .enum(["", "real", "synthetic"])
    .refine((v): boolean => v !== "", "Escolha a origem da população."),
  matter_key: z.string().max(200),
  sample_size: z.number().int().min(1).max(1000),
  population_digest: z.string().length(64),
  screening: z.record(
    z.string(),
    z.object({
      stratum: z.enum([
        "",
        "resolved",
        "residual",
        "rare",
        "insufficient_context",
      ]),
      reason: z.string().max(2000),
    }),
  ),
});
export type SamplingForm = z.infer<typeof samplingFormSchema>;
export function eligibleSamplingSources(
  population: SamplingPopulation,
  origin: string,
  matter: string,
) {
  return population.sources.filter(
    (source) =>
      source.origin === origin &&
      (!matter || source.matter_key === matter) &&
      source.purposes.includes("evaluation"),
  );
}
export function samplingFreezeBody(
  requestId: string,
  form: SamplingForm,
  population: SamplingPopulation,
) {
  const parsed = samplingFormSchema.parse(form);
  if (parsed.population_digest !== population.digest)
    throw new Error(
      "A população mudou. Reconcilie a triagem antes de congelar.",
    );
  const eligible = eligibleSamplingSources(
    population,
    parsed.origin,
    parsed.matter_key,
  );
  if (!eligible.length)
    throw new Error("Não há casos elegíveis neste recorte.");
  const screening = eligible.map((source) => {
    const review = parsed.screening[source.source_link_id];
    if (!review?.stratum || !review.reason.trim())
      throw new Error(
        "Revise o estrato e a justificativa de todos os casos elegíveis.",
      );
    return {
      source_link_id: source.source_link_id,
      stratum: review.stratum,
      reason: review.reason,
    };
  });
  return {
    request_id: requestId,
    lineage_key: parsed.lineage_key,
    algorithm: "grouped-stratified-v1",
    seed: parsed.seed,
    population_digest: parsed.population_digest,
    origin: parsed.origin,
    matter_key: parsed.matter_key,
    sample_size: parsed.sample_size,
    screening,
  };
}
export function getSamplingPopulation(api: ApiFetcher, signal?: AbortSignal) {
  return api<{ data: SamplingPopulation }>("/v1/curation/sampling/population", {
    signal,
  }).then((r) => r.data);
}
export function getSamplingSource(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return api<{ data: SamplingSourceFacts }>(
    `/v1/curation/sampling/sources/${encodeURIComponent(id)}`,
    { signal },
  ).then((r) => r.data);
}
export function getSamplingFrame(
  api: ApiFetcher,
  id: string,
  signal?: AbortSignal,
) {
  return api<{ data: SamplingFrame }>(
    `/v1/curation/sampling/${encodeURIComponent(id)}`,
    { signal },
  ).then((r) => r.data);
}
export function listSamplingFrames(
  api: ApiFetcher,
  cursor: string | null,
  signal?: AbortSignal,
) {
  return api<SamplingPage>(
    `/v1/curation/sampling?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    { signal },
  );
}
export function freezeSample(
  api: ApiFetcher,
  body: ReturnType<typeof samplingFreezeBody>,
) {
  return api<{ data: SamplingFrame }>("/v1/curation/sampling", {
    method: "POST",
    body,
  }).then((r) => r.data);
}
export const samplingRelationSchema = z
  .object({
    left: z.uuid(),
    right: z.uuid(),
    reason: z.string().trim().min(1).max(2000),
  })
  .refine((v) => v.left !== v.right, "Selecione dois casos distintos.");
export type SamplingRelationForm = z.infer<typeof samplingRelationSchema>;
export function relateSamplingSources(
  api: ApiFetcher,
  requestId: string,
  input: SamplingRelationForm,
) {
  return api<{
    data: {
      id: string;
      conflicts: SamplingConflict[];
      idempotent_replay: boolean;
    };
  }>("/v1/curation/sampling/relations", {
    method: "POST",
    body: {
      request_id: requestId,
      ...samplingRelationSchema.parse(input),
    },
  }).then((r) => r.data);
}
