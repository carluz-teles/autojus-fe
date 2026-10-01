"use client";

import { FormProvider } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useDecisionForm } from "../hooks/use-decisions";
import {
  decisionBlockerLabel,
  decisionDifferenceLabel,
  decisionOutcomeLabels,
  type DecisionPreview,
} from "../services/annotation-decisions";
import { contextLabels } from "../services/annotation-form";
import { AnnotationAnswerPreview } from "./annotation-answer";
import { AnnotationAnswerFields } from "./annotation-answer-fields";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { DecisionReceipt } from "./decision-receipt";

export function DecisionForm({
  input,
  refreshing,
  refresh,
}: {
  input: DecisionPreview;
  refreshing: boolean;
  refresh: () => Promise<unknown> | undefined;
}) {
  const state = useDecisionForm(input, refreshing, refresh);
  if (state.receipt) return <DecisionReceipt receipt={state.receipt} />;
  return (
    <div className="space-y-8">
      <section
        className="space-y-3 rounded-lg border p-5"
        aria-label="Condições para decisão"
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {input.origin === "synthetic" ? "Caso sintético" : "Caso real"}
          </Badge>
          <Badge variant="secondary">
            {input.assessment.ready
              ? "Revisões permitem decidir"
              : "Revisões pendentes"}
          </Badge>
        </div>
        <p>
          {input.assessment.qualified_reviews} revisões qualificadas de{" "}
          {input.assessment.required_reviews} exigidas ·{" "}
          {input.assessment.independent_reviews} independentes
        </p>
        {input.assessment.blockers.length ? (
          <ul className="ml-5 list-disc">
            {input.assessment.blockers.map((code) => (
              <li key={code}>{decisionBlockerLabel(code)}</li>
            ))}
          </ul>
        ) : null}
        {input.previous_decision_id ? (
          <a
            href={`/backoffice/decisions/history/${input.previous_decision_id}`}
            className="text-sm underline"
          >
            Consultar decisão anterior antes de substituir
          </a>
        ) : null}
        <Button
          variant="outline"
          onClick={state.refreshComparison}
          disabled={state.locked}
        >
          Atualizar comparação
        </Button>
        {state.stale ? (
          <div role="alert" className="space-y-3">
            <p>
              A comparação precisa ser conferida novamente. Suas edições
              continuam no formulário.
            </p>
            {state.needsRefresh && !state.refreshed ? (
              <p>Atualize as respostas antes de confirmar a conferência.</p>
            ) : null}
            <Button
              variant="outline"
              onClick={state.acknowledgeComparison}
              className="h-auto text-left whitespace-normal"
              disabled={
                state.locked || (state.needsRefresh && !state.refreshed)
              }
            >
              Conferi a comparação atual; manter minhas edições
            </Button>
          </div>
        ) : null}
      </section>
      <section className="space-y-4" aria-label="Respostas e divergências">
        <h2 className="font-display text-2xl">Respostas submetidas</h2>
        {input.assessment.differences.length ? (
          <div className="space-y-2">
            <p className="font-medium">Campos com divergência</p>
            <p className="text-muted-foreground text-sm">
              A comparação inclui justificativas, evidências e ordem dos atos.
              Confira o significado jurídico das diferenças.
            </p>
            <ul className="ml-5 list-disc text-sm">
              {input.assessment.differences.map((path) => (
                <li key={path}>{decisionDifferenceLabel(path)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>Não há divergências estruturais entre as respostas disponíveis.</p>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          {input.reviews.map((review, index) => (
            <article
              key={review.submission_id}
              className="min-w-0 space-y-4 rounded-lg border p-5"
            >
              <h3 className="font-medium">
                Revisão {index + 1} ·{" "}
                {review.mode === "blind" ? "Cega" : "Assistida"}
              </h3>
              <p className="text-sm">
                {review.qualified
                  ? "Habilitação ativa"
                  : "Habilitação indisponível"}{" "}
                ·{" "}
                {review.independent
                  ? "Independência confirmada"
                  : "Sem independência confirmada"}
              </p>
              <AnnotationAnswerPreview annotation={review.annotation} />
              <Button
                type="button"
                variant="outline"
                data-submission={review.submission_id}
                className="h-auto text-left whitespace-normal"
                onClick={state.copyReview}
                disabled={state.locked}
              >
                Copiar revisão {index + 1} para substituir os campos de correção
              </Button>
            </article>
          ))}
        </div>
      </section>
      <div className="grid items-start gap-8 xl:grid-cols-2">
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-5">
          <Field>
            <FieldLabel htmlFor="decision-source">
              Teor integral da intimação
            </FieldLabel>
            <Textarea
              id="decision-source"
              value={input.snapshot.facts.text}
              readOnly
              rows={10}
              onSelect={state.selectEvidence}
              className="min-h-64 leading-7"
              aria-describedby="decision-selection-help"
            />
            <p
              id="decision-selection-help"
              className="text-muted-foreground text-sm"
            >
              Selecione um trecho com mouse ou Shift + setas e use-o como
              evidência nos campos de correção.
            </p>
          </Field>
          <blockquote
            aria-live="polite"
            className="bg-muted/40 rounded-md border p-3 text-sm whitespace-pre-wrap"
          >
            {state.selection?.quote ?? "Nenhum trecho selecionado."}
          </blockquote>
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
              Rubrica congelada
            </summary>
            <p className="mt-3 whitespace-pre-wrap">{input.protocol.rubric}</p>
          </details>
        </aside>
        <FormProvider {...state.form}>
          <form
            onSubmit={state.submit}
            className="min-w-0 space-y-5"
            aria-label="Registrar decisão jurídica"
          >
            <h2 className="font-display text-2xl">Decisão jurídica</h2>
            <fieldset disabled={state.locked} className="space-y-5">
              <Field>
                <FieldLabel htmlFor="decision-outcome">Resultado</FieldLabel>
                <NativeSelect
                  id="decision-outcome"
                  {...state.meta.register("outcome")}
                >
                  <NativeSelectOption value="">Selecione</NativeSelectOption>
                  {Object.entries(decisionOutcomeLabels).map(
                    ([value, label]) => (
                      <NativeSelectOption key={value} value={value}>
                        {label}
                      </NativeSelectOption>
                    ),
                  )}
                </NativeSelect>
              </Field>
              {state.outcome === "accepted" ? (
                <Field>
                  <FieldLabel htmlFor="decision-selected">
                    Resposta aceita integralmente
                  </FieldLabel>
                  <NativeSelect
                    id="decision-selected"
                    {...state.meta.register("selected")}
                  >
                    <NativeSelectOption value="">
                      Escolha uma resposta
                    </NativeSelectOption>
                    {input.reviews.map((review, index) => (
                      <NativeSelectOption
                        key={review.submission_id}
                        value={review.submission_id}
                      >
                        Revisão {index + 1}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="text-muted-foreground text-sm">
                    Para alterar qualquer dimensão, escolha resposta corrigida.
                  </p>
                </Field>
              ) : null}
              {state.outcome === "corrected" ||
              state.outcome === "insufficient" ? (
                <AnnotationAnswerFields input={input} state={state} />
              ) : null}
              <Field>
                <FieldLabel htmlFor="decision-reason">
                  Justificativa da decisão
                </FieldLabel>
                <Textarea
                  id="decision-reason"
                  rows={4}
                  {...state.meta.register("reason")}
                />
              </Field>
            </fieldset>
            <Button type="submit" disabled={!state.canDecide}>
              Registrar decisão jurídica
            </Button>
            <p className="text-muted-foreground text-sm">
              A decisão usa todas as respostas submetidas e preserva a versão
              anterior. As edições deste formulário ficam nesta aba até o envio.
            </p>
          </form>
        </FormProvider>
      </div>
      <section
        className="space-y-4 rounded-lg border p-5"
        aria-label="Alertas críticos"
      >
        <h2 className="font-display text-2xl">Alertas críticos</h2>
        <p className="text-muted-foreground text-sm">
          Registre um problema que exige revisão adicional. O alerta permanece
          no histórico.
        </p>
        {input.alerts.map((alert) => (
          <p key={alert.id} className="border-l-2 pl-3 whitespace-pre-wrap">
            {alert.reason}
          </p>
        ))}
        <form onSubmit={state.addAlert} className="space-y-3">
          <Field>
            <FieldLabel htmlFor="decision-alert-reason">
              Motivo do alerta crítico
            </FieldLabel>
            <Textarea
              id="decision-alert-reason"
              rows={3}
              {...state.alert.register("reason")}
              disabled={state.locked}
            />
          </Field>
          <Button type="submit" variant="outline" disabled={state.locked}>
            Registrar alerta crítico
          </Button>
        </form>
      </section>
      {state.message ? (
        <p role="status" className="whitespace-pre-wrap">
          {state.message}
        </p>
      ) : null}
      {state.commands.mutation.error ? (
        <p role="alert">{state.commands.mutation.error.message}</p>
      ) : null}
      {state.commands.uncertain ? (
        <div role="alert" className="space-y-3 rounded-md border p-4">
          <p>
            O resultado do envio é desconhecido. Recupere o mesmo comando antes
            de enviar outra decisão ou alerta.
          </p>
          <Button
            onClick={state.recover}
            className="h-auto text-left whitespace-normal"
            disabled={state.commands.mutation.isPending}
          >
            Recuperar exatamente o último envio
          </Button>
        </div>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </div>
  );
}
