"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { useAiFeedback } from "../hooks/use-ai-feedback";
import { useFeedbackScope } from "../hooks/use-feedback-scope";

export function AiFeedback({
  resultId,
  question = "Esta resposta foi útil?",
}: {
  resultId: string;
  question?: string;
}) {
  const scope = useFeedbackScope(resultId);
  return scope ? (
    <ScopedFeedback
      key={scope.componentKey}
      resultId={resultId}
      queryKey={scope.queryKey}
      question={question}
    />
  ) : null;
}

function ScopedFeedback({
  resultId,
  queryKey,
  question,
}: {
  resultId: string;
  queryKey: readonly string[];
  question: string;
}) {
  const { observeCTA, ...s } = useAiFeedback(resultId, queryKey);
  return (
    <section aria-label={question} className="mt-3 flex flex-col gap-2">
      <div ref={observeCTA} className="flex flex-wrap items-center gap-2">
        <p id={`${s.id}-question`} className="text-muted-foreground text-xs">
          {question}
        </p>
        <ToggleGroup
          aria-labelledby={`${s.id}-question`}
          value={s.selected}
          onValueChange={s.select}
          disabled={!s.canVote}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="yes" type="button">
            <ThumbsUp aria-hidden />
            Sim
          </ToggleGroupItem>
          <ToggleGroupItem value="no" type="button">
            <ThumbsDown aria-hidden />
            Não
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <p
        role={s.isError ? "alert" : "status"}
        className="text-muted-foreground text-xs"
        aria-live="polite"
      >
        {s.message}
        {s.wait > 0 ? ` Aguarde ${s.wait} s.` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {s.needsSignIn ? (
          <Button type="button" size="sm" variant="outline" onClick={s.signIn}>
            Entrar novamente
          </Button>
        ) : null}
        {s.canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={s.busy || s.wait > 0}
            onClick={s.retry}
          >
            Tentar novamente
          </Button>
        ) : null}
        {s.isError && !s.canRetry && !s.needsSignIn ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={s.busy || s.wait > 0}
            onClick={s.refresh}
          >
            Atualizar feedback
          </Button>
        ) : null}
        {s.state?.status === "active" ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={s.openDetails}
              disabled={!s.canVote || s.editor.editing}
            >
              Adicionar ou editar comentário
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={s.withdraw}
              disabled={!s.canVote}
            >
              Retirar feedback
            </Button>
          </>
        ) : null}
      </div>
      {s.detailsVisible ? (
        <form onSubmit={s.submitDetails} className="flex flex-col gap-3">
          <FieldGroup>
            <Field data-invalid={!!s.editor.form.formState.errors.reason_code}>
              <FieldLabel htmlFor={`${s.id}-reason`}>
                Motivo (opcional)
              </FieldLabel>
              <NativeSelect
                id={`${s.id}-reason`}
                disabled={!s.canVote}
                {...s.editor.form.register("reason_code")}
                aria-invalid={!!s.editor.form.formState.errors.reason_code}
              >
                <NativeSelectOption value="">Sem motivo</NativeSelectOption>
                <NativeSelectOption value="incorrect">
                  Informação incorreta
                </NativeSelectOption>
                <NativeSelectOption value="incomplete">
                  Resposta incompleta
                </NativeSelectOption>
                <NativeSelectOption value="irrelevant">
                  Fora do assunto
                </NativeSelectOption>
                <NativeSelectOption value="unclear">
                  Pouco clara
                </NativeSelectOption>
                <NativeSelectOption value="other">
                  Outro motivo
                </NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field data-invalid={!!s.editor.form.formState.errors.comment}>
              <FieldLabel htmlFor={`${s.id}-comment`}>
                Comentário (opcional)
              </FieldLabel>
              <Textarea
                id={`${s.id}-comment`}
                rows={2}
                disabled={!s.canVote}
                {...s.editor.form.register("comment")}
                aria-invalid={!!s.editor.form.formState.errors.comment}
                aria-describedby={`${s.id}-comment-error`}
              />
              <FieldDescription id={`${s.id}-comment-error`} role="status">
                {s.editor.form.formState.errors.comment?.message}
              </FieldDescription>
            </Field>
            <Field data-invalid={!!s.editor.form.formState.errors.correction}>
              <FieldLabel htmlFor={`${s.id}-correction`}>
                Como você corrigiria? (opcional)
              </FieldLabel>
              <Textarea
                id={`${s.id}-correction`}
                rows={3}
                disabled={!s.canVote}
                {...s.editor.form.register("correction")}
                aria-invalid={!!s.editor.form.formState.errors.correction}
                aria-describedby={`${s.id}-correction-error`}
              />
              <FieldDescription id={`${s.id}-correction-error`} role="status">
                {s.editor.form.formState.errors.correction?.message}
              </FieldDescription>
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={!s.canVote || s.state?.status !== "active"}
            >
              Salvar comentário
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={s.busy || s.canRetry}
              onClick={s.editor.close}
            >
              Fechar
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
