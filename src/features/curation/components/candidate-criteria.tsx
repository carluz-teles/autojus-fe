"use client";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import {
  type CandidateForm,
  candidateRuleFields,
  type CandidateRuleForm,
  candidateStrata,
} from "../services/candidate-form";
import type {
  CandidatePolicy,
  CandidateRule,
} from "../services/candidate-schemas";
import { samplingStrata } from "../services/sampling";

export function CandidateRuleFields({
  value,
  change,
  prefix,
  errors,
}: {
  value: CandidateRuleForm;
  change: (value: CandidateRuleForm) => void;
  prefix: string;
  errors: Record<string, string>;
}) {
  return (
    <FieldGroup className="grid items-start gap-4 sm:grid-cols-2">
      {candidateRuleFields.map((f) => {
        const id = `candidate-${prefix}-${f.key}`,
          error = errors[`${prefix}.${f.key}`];
        return (
          <Field key={f.key} data-invalid={!!error}>
            <FieldLabel htmlFor={id}>{f.label}</FieldLabel>
            <Input
              id={id}
              value={value[f.key]}
              inputMode={f.rate ? "decimal" : "numeric"}
              autoComplete="off"
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => change({ ...value, [f.key]: e.target.value })}
            />
            {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
          </Field>
        );
      })}
    </FieldGroup>
  );
}
export function CandidateStratumFields({
  form,
  change,
  errors,
  coverage,
}: {
  form: CandidateForm;
  change: (update: (f: CandidateForm) => CandidateForm) => void;
  errors: Record<string, string>;
  coverage: (key: (typeof candidateStrata)[number]) => string;
}) {
  return (
    <FieldGroup>
      {candidateStrata.map((key) => {
        const item = form.strata[key],
          id = `candidate-stratum-${key}`,
          label = samplingStrata.find((s) => s.value === key)?.label ?? key,
          error = errors[`strata.${key}.choice`];
        return (
          <FieldSet key={key} className="rounded-lg border p-4">
            <FieldLegend>{label}</FieldLegend>
            <FieldDescription>{coverage(key)}</FieldDescription>
            <Field data-invalid={!!error}>
              <FieldLabel htmlFor={id}>Critérios para {label}</FieldLabel>
              <NativeSelect
                id={id}
                className="w-full"
                value={item.choice}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => {
                  const choice = e.target.value as typeof item.choice;
                  change((f) => ({
                    ...f,
                    strata: {
                      ...f.strata,
                      [key]: { ...f.strata[key], choice },
                    },
                  }));
                }}
              >
                <NativeSelectOption value="">Escolher…</NativeSelectOption>
                <NativeSelectOption value="require">
                  Exigir critérios próprios
                </NativeSelectOption>
                <NativeSelectOption value="omit">
                  Não exigir critérios próprios
                </NativeSelectOption>
              </NativeSelect>
              {error ? (
                <FieldError id={`${id}-error`}>{error}</FieldError>
              ) : null}
            </Field>
            {item.choice === "require" ? (
              <CandidateRuleFields
                value={item.rule}
                prefix={`strata.${key}`}
                errors={errors}
                change={(rule) =>
                  change((f) => ({
                    ...f,
                    strata: { ...f.strata, [key]: { ...f.strata[key], rule } },
                  }))
                }
              />
            ) : null}
          </FieldSet>
        );
      })}
    </FieldGroup>
  );
}
function RuleValues({ rule }: { rule: CandidateRule }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {candidateRuleFields.map((f) => (
        <div key={f.key}>
          <dt className="text-muted-foreground">{f.label}</dt>
          <dd className="font-medium tabular-nums">
            {f.rate
              ? `${(rule[f.key] / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
              : rule[f.key]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export function CandidatePolicyView({ policy }: { policy: CandidatePolicy }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">Critérios gerais</h3>
      <RuleValues rule={policy.overall} />
      <details>
        <summary className="cursor-pointer font-medium">
          Critérios por estrato
        </summary>
        <div className="mt-4 flex flex-col gap-5">
          {candidateStrata.map((key) => (
            <section className="flex flex-col gap-2" key={key}>
              <h4 className="font-medium">
                {samplingStrata.find((s) => s.value === key)?.label ?? key}
              </h4>
              {policy.strata[key] ? (
                <RuleValues rule={policy.strata[key]} />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Sem critérios próprios; os casos continuam nas métricas
                  gerais.
                </p>
              )}
            </section>
          ))}
        </div>
      </details>
    </div>
  );
}
