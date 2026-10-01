"use client";

import { FormProvider } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import { useAnnotationForm } from "../hooks/use-annotations";
import type {
  AnnotationAssignmentInput,
  AnnotationDraft,
} from "../services/annotation-assignments";
import { contextLabels } from "../services/annotation-form";
import { AnnotationAnswerPreview } from "./annotation-answer";
import { AnnotationAnswerFields } from "./annotation-answer-fields";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function AnnotationQuestionnaire({
  input,
  writable,
  previousDraft,
}: {
  input: AnnotationAssignmentInput;
  writable: boolean;
  previousDraft?: AnnotationDraft;
}) {
  const state = useAnnotationForm(input, writable, previousDraft);
  if (state.initialError)
    return (
      <p role="alert">
        Não foi possível abrir o rascunho: {state.initialError}. Ele permanece
        preservado; nenhum formulário vazio será salvo.
      </p>
    );
  return (
    <FormProvider {...state.form}>
      <form onSubmit={state.submit} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
          <div className="space-y-1">
            <Badge variant="outline">
              {input.assignment.mode === "blind"
                ? "Revisão cega"
                : "Revisão assistida"}
            </Badge>
            <p className="text-muted-foreground text-sm">
              Reserva até {state.leaseLabel} · horário de Brasília
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={state.renew}
              disabled={!state.canWrite || state.commands.mutation.isPending}
            >
              Renovar reserva
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={state.release}
              disabled={
                !state.editable ||
                state.expired ||
                state.dirty ||
                state.commands.mutation.isPending ||
                state.commands.uncertain
              }
            >
              Devolver à fila
            </Button>
          </div>
        </div>
        {!writable || state.expired ? (
          <p role="alert" className="rounded-md border p-4">
            A gravação está suspensa. Confira o estado da reserva e seu acesso.
            As edições nesta tela foram preservadas; alterações ainda não salvas
            não foram enviadas.
          </p>
        ) : null}
        {previousDraft?.annotation ? (
          <details className="rounded-md border p-4">
            <summary className="cursor-pointer font-medium">
              Meu rascunho da reserva anterior
            </summary>
            <div className="mt-4 space-y-4">
              <AnnotationAnswerPreview annotation={previousDraft.annotation} />
              <Button
                type="button"
                variant="outline"
                onClick={state.copyPreviousDraft}
                disabled={!state.canWrite || state.commands.mutation.isPending}
              >
                Copiar meu rascunho anterior para este formulário
              </Button>
              <p className="text-muted-foreground text-sm">
                A cópia substitui os campos locais. Confira o texto e as
                respostas antes de salvar.
              </p>
            </div>
          </details>
        ) : null}
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5">
            <Field>
              <FieldLabel htmlFor="annotation-source">
                Teor integral da intimação
              </FieldLabel>
              <Textarea
                id="annotation-source"
                value={input.snapshot.facts.text}
                readOnly
                onSelect={state.selectEvidence}
                rows={10}
                className="min-h-64 resize-y leading-7"
                aria-describedby="selection-help"
              />
              <p id="selection-help" className="text-muted-foreground text-sm">
                Selecione um trecho com o mouse ou Shift + setas. Depois use o
                botão de evidência do ato ou do prazo correspondente.
              </p>
            </Field>
            <div
              className="bg-muted/40 rounded-md border p-3"
              aria-live="polite"
            >
              <p className="text-sm font-medium">Trecho selecionado</p>
              <blockquote className="mt-2 text-sm whitespace-pre-wrap">
                {state.selection?.quote ?? "Nenhum trecho selecionado."}
              </blockquote>
            </div>
            <details open>
              <summary className="cursor-pointer font-medium">
                Contexto disponível
              </summary>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                {state.context.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-muted-foreground">
                      {contextLabels[key] ?? key}
                    </dt>
                    <dd className="whitespace-pre-wrap">
                      {value || "Não informado"}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            <details>
              <summary className="cursor-pointer font-medium">
                Orientação de revisão
              </summary>
              <p className="mt-3 text-sm whitespace-pre-wrap">
                {input.protocol.rubric}
              </p>
            </details>
            {input.assignment.mode === "assisted" && input.prediction ? (
              <section
                className="bg-muted/30 space-y-3 rounded-lg border p-4"
                aria-label="Sugestão original"
              >
                <h2 className="font-display text-lg">Sugestão original</h2>
                {input.prediction.suggestion.annotation ? (
                  <AnnotationAnswerPreview
                    annotation={input.prediction.suggestion.annotation}
                  />
                ) : (
                  <p className="text-sm">
                    Tipo indicado: {state.suggestionTypeLabel}
                  </p>
                )}
                {input.prediction.suggestion.type_requires_review ||
                input.prediction.suggestion.interest_requires_review ? (
                  <p className="text-sm">
                    O motor sinalizou necessidade de revisão. Confirme tipo,
                    destinatário e prazo separadamente.
                  </p>
                ) : null}
                {input.prediction.suggestion.deadline_cues.map((cue, index) => (
                  <blockquote
                    key={index}
                    className="border-l-2 pl-3 text-sm whitespace-pre-wrap"
                  >
                    {cue.quote}
                  </blockquote>
                ))}
                <p className="text-muted-foreground text-xs">
                  A sugestão desta reserva permanece visível enquanto você
                  preenche sua própria resposta.
                </p>
              </section>
            ) : null}
          </aside>
          <div className="space-y-6">
            <fieldset
              className="space-y-6"
              disabled={!state.editable || state.submissionPending}
            >
              <legend className="font-display mb-4 text-2xl">
                Sua análise
              </legend>
              <AnnotationAnswerFields input={input} state={state} />
            </fieldset>
            {state.remoteConflict ? (
              <div role="alert" className="space-y-3 rounded-md border p-4">
                <p>
                  Outra revisão do rascunho foi salva. Suas edições locais não
                  foram substituídas.
                </p>
                <Button type="button" variant="outline" onClick={state.compare}>
                  Comparar com a versão salva
                </Button>
                {state.showConflict ? (
                  <div className="space-y-4">
                    <AnnotationAnswerPreview
                      annotation={input.draft.annotation}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={state.useRemoteDraft}>
                        Substituir meus campos pela versão salva
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={state.keepLocalDraft}
                      >
                        Manter minhas edições após comparar
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            {state.commands.mutation.error ? (
              <p role="alert">{state.commands.mutation.error.message}</p>
            ) : null}
            {state.validationMessages.length ? (
              <div role="alert">
                <p className="font-medium">Confira a resposta:</p>
                <ul className="ml-5 list-disc">
                  {state.validationMessages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {state.commands.uncertain ? (
              <div role="alert" className="space-y-3 rounded-md border p-4">
                <p>
                  O resultado do último envio é desconhecido. Recupere o mesmo
                  comando antes de salvar novas edições ou submeter.
                </p>
                <Button
                  type="button"
                  onClick={state.recover}
                  disabled={state.commands.mutation.isPending}
                >
                  Recuperar exatamente o último envio
                </Button>
              </div>
            ) : null}
            <div className="bg-background space-y-3 border-t py-4 xl:sticky xl:bottom-0">
              <p role="status" className="text-sm">
                {state.commands.mutation.isPending
                  ? "Aguardando confirmação do servidor…"
                  : (state.message ??
                    (state.dirty
                      ? "Há edições ainda não confirmadas no servidor."
                      : "Sem alterações pendentes."))}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={state.save}
                  disabled={
                    !state.canWrite ||
                    state.commands.mutation.isPending ||
                    !state.dirty
                  }
                >
                  Salvar rascunho
                </Button>
                <Button
                  type="submit"
                  disabled={
                    !state.canWrite || state.commands.mutation.isPending
                  }
                >
                  Submeter minha resposta
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                O rascunho é salvo após uma pausa na edição. Somente a submissão
                encerra esta revisão.
              </p>
            </div>
          </div>
        </div>
        <AnnotationNavigationDialog navigation={state.navigation} />
      </form>
    </FormProvider>
  );
}
