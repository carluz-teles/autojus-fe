import {
  type CandidatePolicy,
  candidatePolicySchema,
  type CandidateRule,
  candidateRuleSchema,
  type CandidateStratum,
} from "./candidate-schemas";
import type { ComparisonDelivery } from "./comparison-schemas";

export const candidateRuleFields = [
  { key: "min_cases", label: "Mínimo de casos", rate: false },
  { key: "min_groups", label: "Mínimo de grupos", rate: false },
  { key: "min_acceptable_bps", label: "Mínimo aceitável (%)", rate: true },
  {
    key: "max_critical_bps",
    label: "Máximo com sinal crítico (%)",
    rate: true,
  },
  { key: "max_unavailable_bps", label: "Máximo indisponível (%)", rate: true },
  { key: "max_regression_bps", label: "Máximo de regressões (%)", rate: true },
] as const;
export const candidateStrata = [
  "resolved",
  "residual",
  "rare",
  "insufficient_context",
] as const;
export type CandidateRuleForm = Record<keyof CandidateRule, string>;
export type CandidateForm = {
  baseline: string;
  candidate: string;
  reason: string;
  overall: CandidateRuleForm;
  strata: Record<
    CandidateStratum,
    { choice: "" | "require" | "omit"; rule: CandidateRuleForm }
  >;
};
export function emptyCandidateRule(): CandidateRuleForm {
  return {
    min_cases: "",
    min_groups: "",
    min_acceptable_bps: "",
    max_critical_bps: "",
    max_unavailable_bps: "",
    max_regression_bps: "",
  };
}
export function emptyCandidateForm(): CandidateForm {
  return {
    baseline: "",
    candidate: "",
    reason: "",
    overall: emptyCandidateRule(),
    strata: {
      resolved: { choice: "", rule: emptyCandidateRule() },
      residual: { choice: "", rule: emptyCandidateRule() },
      rare: { choice: "", rule: emptyCandidateRule() },
      insufficient_context: { choice: "", rule: emptyCandidateRule() },
    },
  };
}
export type CandidateBody = {
  expected_comparison_digest: string;
  baseline_report_id: string;
  candidate_report_id: string;
  policy: CandidatePolicy;
  reason: string;
  confirmed: true;
};
function percent(value: string): number | null {
  const parts = /^(\d{1,3})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!parts) return null;
  const bps = Number(parts[1]) * 100 + Number((parts[2] ?? "").padEnd(2, "0"));
  return bps <= 10000 ? bps : null;
}
export function parseCandidateForm(
  form: CandidateForm,
  delivery?: ComparisonDelivery,
): { body: CandidateBody | null; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  function rule(
    value: CandidateRuleForm,
    prefix: string,
  ): CandidateRule | null {
    const parsed: Record<string, number> = {};
    for (const field of candidateRuleFields) {
      const text = value[field.key].trim();
      const number = field.rate
        ? percent(text)
        : /^\d{1,4}$/.test(text)
          ? Number(text)
          : null;
      if (number === null || (!field.rate && (number < 1 || number > 1000)))
        errors[`${prefix}.${field.key}`] = field.rate
          ? "Informe de 0 a 100%, com até duas casas decimais."
          : "Informe um inteiro entre 1 e 1.000.";
      else parsed[field.key] = number;
    }
    if (parsed.min_groups > parsed.min_cases)
      errors[`${prefix}.min_groups`] =
        "Grupos mínimos não podem exceder casos mínimos.";
    const result = candidateRuleSchema.safeParse(parsed);
    return result.success ? result.data : null;
  }
  const overall = rule(form.overall, "overall");
  const strata: Partial<CandidatePolicy["strata"]> = {};
  for (const key of candidateStrata) {
    const item = form.strata[key];
    if (!item.choice)
      errors[`strata.${key}.choice`] =
        "Escolha se este estrato terá critérios próprios.";
    else
      strata[key] =
        item.choice === "require" ? rule(item.rule, `strata.${key}`) : null;
  }
  const comparison = delivery?.document.comparison;
  if (comparison?.split !== "validation")
    errors.comparison =
      "Abra uma comparação de validação para selecionar o candidato.";
  for (const field of ["baseline", "candidate"] as const) {
    if (!comparison?.sources.some((s) => s.report_id === form[field]))
      errors[field] = "Selecione uma fonte desta comparação.";
  }
  if (form.baseline && form.baseline === form.candidate)
    errors.candidate = "Escolha um candidato diferente da referência.";
  const reason = form.reason.trim();
  if (!reason || reason.includes("\0"))
    errors.reason = "Escreva uma justificativa para a seleção.";
  else if (new TextEncoder().encode(reason).byteLength > 4000)
    errors.reason = "A justificativa está muito longa. Reduza o texto.";
  const policy = candidatePolicySchema.safeParse({
    version: "type-candidate-criteria-v1",
    overall,
    strata,
  });
  if (Object.keys(errors).length || !delivery || !policy.success)
    return { body: null, errors };
  return {
    body: {
      expected_comparison_digest: delivery.digest,
      baseline_report_id: form.baseline,
      candidate_report_id: form.candidate,
      policy: policy.data,
      reason,
      confirmed: true,
    },
    errors,
  };
}
