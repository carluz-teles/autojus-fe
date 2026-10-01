"use client";

import type { MouseEventHandler } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useAnnotationAct } from "../hooks/use-annotations";
import type { AnnotationEditorInput } from "../services/annotation-assignments";
import {
  actionabilityOptions,
  deadlineKindOptions,
  deadlineUnitOptions,
  evidencePreview,
  optionalQuantity,
  optionalText,
  recipientOptions,
} from "../services/annotation-form";
import type { AnnotationEvidence } from "../services/annotation-schema";

export function AnnotationActEditor({
  index,
  input,
  selection,
  remove,
}: {
  index: number;
  input: AnnotationEditorInput;
  selection: AnnotationEvidence | null;
  remove: MouseEventHandler<HTMLButtonElement>;
}) {
  const state = useAnnotationAct(index, input, selection),
    { register } = state.form;
  return (
    <fieldset className="space-y-5 rounded-lg border p-5">
      <legend className="font-display px-2 text-xl">Ato {index + 1}</legend>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          data-index={index}
          onClick={remove}
        >
          Remover ato {index + 1}
        </Button>
      </div>
      <Field>
        <FieldLabel htmlFor={`act-type-${index}`}>Tipo do ato</FieldLabel>
        <NativeSelect
          id={`act-type-${index}`}
          {...register(`label.acts.${index}.act_type`, {
            setValueAs: optionalText,
          })}
        >
          <NativeSelectOption value="">Não definido</NativeSelectOption>
          {state.options.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError errors={[state.errors?.act_type]} />
      </Field>
      {state.suggestion?.type_in_catalog ? (
        <Button
          type="button"
          variant="outline"
          onClick={state.applySuggestedType}
        >
          Aplicar o tipo sugerido a este ato
        </Button>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`recipient-${index}`}>
            A quem se dirige?
          </FieldLabel>
          <NativeSelect
            id={`recipient-${index}`}
            {...register(`label.acts.${index}.recipient`)}
          >
            <NativeSelectOption value="">Selecione</NativeSelectOption>
            {recipientOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[state.errors?.recipient]} />
        </Field>
        <Field>
          <FieldLabel htmlFor={`actionability-${index}`}>
            O que o ato representa?
          </FieldLabel>
          <NativeSelect
            id={`actionability-${index}`}
            {...register(`label.acts.${index}.actionability`)}
          >
            <NativeSelectOption value="">Selecione</NativeSelectOption>
            {actionabilityOptions.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[state.errors?.actionability]} />
        </Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Evidência do ato {index + 1}</p>
        <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-wrap">
          {evidencePreview(state.act.evidence)}
        </blockquote>
        <Button
          type="button"
          variant="outline"
          onClick={state.applyActEvidence}
          disabled={!selection}
        >
          Usar trecho selecionado como evidência do ato {index + 1}
        </Button>
        <FieldError errors={[state.errors?.evidence]} />
      </div>
      <Field>
        <FieldLabel htmlFor={`deadline-kind-${index}`}>
          Natureza do prazo
        </FieldLabel>
        <NativeSelect
          id={`deadline-kind-${index}`}
          value={state.act.deadline.kind}
          onChange={state.changeKind}
        >
          <NativeSelectOption value="">Selecione</NativeSelectOption>
          {deadlineKindOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <p className="text-muted-foreground text-xs">
          Mudar a natureza limpa os campos incompatíveis com a nova opção.
        </p>
      </Field>
      {state.act.deadline.kind === "legal_rule" ? (
        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor={`rule-${index}`}>
              Regra revisada deste protocolo
            </FieldLabel>
            <NativeSelect
              id={`rule-${index}`}
              value={state.act.deadline.legal_rule_ref ?? ""}
              onChange={state.changeRule}
            >
              <NativeSelectOption value="">
                Selecione uma regra
              </NativeSelectOption>
              {state.rules.map((rule) => (
                <NativeSelectOption key={rule.value} value={rule.value}>
                  {rule.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          {state.rules.length === 0 ? (
            <p>
              Nenhuma regra foi revisada neste protocolo. Registre a
              insuficiência de contexto quando aplicável.
            </p>
          ) : null}
          {state.rule ? (
            <div className="bg-muted/40 space-y-1 rounded-md p-3 text-sm">
              <p>{state.rule.citation}</p>
              <p className="whitespace-pre-wrap">{state.rule.review_note}</p>
              <p className="break-words">
                Fonte: {state.rule.source_reference}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      {state.act.deadline.kind === "explicit" ||
      state.act.deadline.kind === "legal_rule" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`quantity-${index}`}>Quantidade</FieldLabel>
              <Input
                id={`quantity-${index}`}
                type="number"
                min="1"
                step="1"
                readOnly={state.act.deadline.kind === "legal_rule"}
                {...register(`label.acts.${index}.deadline.quantity`, {
                  setValueAs: optionalQuantity,
                })}
              />
              <FieldError errors={[state.errors?.deadline?.quantity]} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`unit-${index}`}>Unidade</FieldLabel>
              <NativeSelect
                id={`unit-${index}`}
                {...register(`label.acts.${index}.deadline.unit`, {
                  setValueAs: optionalText,
                })}
                disabled={state.act.deadline.kind === "legal_rule"}
              >
                <NativeSelectOption value="">Não definida</NativeSelectOption>
                {deadlineUnitOptions.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError errors={[state.errors?.deadline?.unit]} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor={`anchor-${index}`}>
              Evento que inicia a contagem, se conhecido
            </FieldLabel>
            <Input
              id={`anchor-${index}`}
              readOnly={state.act.deadline.kind === "legal_rule"}
              {...register(`label.acts.${index}.deadline.anchor_event`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`start-rule-${index}`}>
              Regra de início, se conhecida
            </FieldLabel>
            <Input
              id={`start-rule-${index}`}
              readOnly={state.act.deadline.kind === "legal_rule"}
              {...register(`label.acts.${index}.deadline.start_rule`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`anchor-date-${index}`}>
              Data do termo inicial, se conhecida
            </FieldLabel>
            <Input
              id={`anchor-date-${index}`}
              type="date"
              {...register(`label.acts.${index}.deadline.anchor_date`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
          <p className="text-muted-foreground text-sm">
            A data final depende de validação do calendário. Informe abaixo o
            contexto que falta; quantidade e unidade podem ser registradas
            separadamente.
          </p>
        </>
      ) : null}
      {state.act.deadline.kind === "scheduled_date" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`event-${index}`}>Evento agendado</FieldLabel>
            <Input
              id={`event-${index}`}
              {...register(`label.acts.${index}.deadline.event`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`due-date-${index}`}>
              Data indicada no texto
            </FieldLabel>
            <Input
              id={`due-date-${index}`}
              type="date"
              {...register(`label.acts.${index}.deadline.due_date`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
        </div>
      ) : null}
      {state.act.deadline.kind ? (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Evidência do prazo {index + 1}
            </p>
            <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-wrap">
              {evidencePreview(state.act.deadline.evidence)}
            </blockquote>
            <Button
              type="button"
              variant="outline"
              onClick={state.applyDeadlineEvidence}
              disabled={!selection}
            >
              Usar trecho selecionado como evidência do prazo {index + 1}
            </Button>
          </div>
          <Field>
            <FieldLabel htmlFor={`condition-${index}`}>
              Condição ou ressalva, se houver
            </FieldLabel>
            <Input
              id={`condition-${index}`}
              {...register(`label.acts.${index}.deadline.condition`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`reason-${index}`}>
              Justificativa sobre o prazo
            </FieldLabel>
            <Textarea
              id={`reason-${index}`}
              rows={2}
              {...register(`label.acts.${index}.deadline.reason`, {
                setValueAs: optionalText,
              })}
            />
          </Field>
        </>
      ) : null}
      <FieldError
        errors={[
          state.errors?.deadline,
          state.errors?.deadline?.evidence,
          state.errors?.deadline?.legal_rule_ref,
          state.errors?.deadline?.due_date,
        ]}
      />
      {state.suggestion?.deadline_cues.length ? (
        <details className="rounded-md border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Prazos encontrados na sugestão original
          </summary>
          <div className="mt-3 space-y-3">
            {state.suggestion.deadline_cues.map((cue, i) => (
              <div key={i} className="space-y-2">
                <blockquote className="text-sm whitespace-pre-wrap">
                  {cue.quote}
                </blockquote>
                <Button
                  type="button"
                  variant="outline"
                  data-cue={i}
                  onClick={state.applySuggestedDeadline}
                  disabled={!cue.exact_source_span}
                >
                  Aplicar este prazo ao ato {index + 1}
                </Button>
                {!cue.exact_source_span ? (
                  <p className="text-muted-foreground text-xs">
                    Selecione manualmente a evidência no texto integral.
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </fieldset>
  );
}
