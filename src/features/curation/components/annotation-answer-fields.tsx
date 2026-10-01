"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import type { useAnnotationForm } from "../hooks/use-annotations";
import type { AnnotationEditorInput } from "../services/annotation-assignments";
import {
  answerabilityOptions,
  optionalText,
} from "../services/annotation-form";
import { AnnotationActEditor } from "./annotation-act";
export function AnnotationAnswerFields({
  input,
  state,
}: {
  input: AnnotationEditorInput;
  state: Pick<
    ReturnType<typeof useAnnotationForm>,
    "form" | "fields" | "selection" | "removeAct" | "addAct" | "missingContext"
  >;
}) {
  const {
    register,
    formState: { errors },
  } = state.form;
  return (
    <>
      <Field>
        <FieldLabel htmlFor="answerability">
          Quanto é possível determinar?
        </FieldLabel>
        <NativeSelect id="answerability" {...register("label.answerability")}>
          <NativeSelectOption value="">Selecione</NativeSelectOption>
          {answerabilityOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <FieldError errors={[errors.label?.answerability]} />
      </Field>
      {state.fields.map((field, index) => (
        <AnnotationActEditor
          key={field.id}
          index={index}
          input={input}
          selection={state.selection}
          remove={state.removeAct}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={state.addAct}
        disabled={state.fields.length >= 32}
      >
        Adicionar ato
      </Button>
      <Field>
        <FieldLabel htmlFor="missing-context">
          Contexto que falta, um item por linha
        </FieldLabel>
        <Textarea
          id="missing-context"
          rows={3}
          value={state.missingContext.value}
          onChange={state.missingContext.onChange}
          onBlur={state.missingContext.onBlur}
          name={state.missingContext.name}
        />
        <FieldError errors={[errors.label?.missing_context]} />
        <p className="text-muted-foreground text-xs">
          Ex.: papel do destinatário, termo inicial ou calendário aplicável.
          Deixe vazio somente quando todas as dimensões estiverem determinadas.
        </p>
      </Field>
      <Field>
        <FieldLabel htmlFor="abstention-reason">
          Por que o contexto é insuficiente?
        </FieldLabel>
        <Textarea
          id="abstention-reason"
          rows={3}
          {...register("label.abstention_reason", {
            setValueAs: optionalText,
          })}
        />
        <FieldError errors={[errors.label?.abstention_reason]} />
        <p className="text-muted-foreground text-xs">
          Preencha quando optar por contexto insuficiente. Em respostas
          determinadas ou parciais, deixe vazio.
        </p>
      </Field>
    </>
  );
}
