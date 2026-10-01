"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  useEvaluationPreparation,
  useEvaluationWorkspace,
} from "../hooks/use-evaluations";
import type { DatasetRelease } from "../services/dataset-releases";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import type { EvaluationPreview } from "../services/evaluation-schemas";
import { splitLabels } from "../services/sampling";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function EvaluationWorkspace({ id }: { id: string }) {
  const state = useEvaluationWorkspace(id);
  if (!state.allowed)
    return (
      <p role="alert">
        Avaliações exigem permissões de publicação e inferência.
      </p>
    );
  return (
    <div className="max-w-5xl space-y-8">
      <header className="space-y-2">
        <a className="text-sm underline" href={`/backoffice/releases/${id}`}>
          Voltar ao dataset
        </a>
        <h1 className="font-display text-3xl">Avaliar intimações</h1>
        <p className="text-muted-foreground">
          {state.release.data?.name ?? "Dataset selecionado"}
        </p>
        <p>
          Prepare o plano, confira o consumo e autorize uma execução
          separadamente.
        </p>
      </header>
      <a
        className="text-sm underline"
        href={`/backoffice/releases/${id}/comparisons`}
      >
        Comparar relatórios A/B/C já emitidos
      </a>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar dataset e planos
      </Button>
      {state.release.isPending ? (
        <p role="status">Carregando dataset…</p>
      ) : null}
      {state.release.isError ? (
        <p role="alert">
          Não foi possível atualizar o dataset. Verifique o acesso antes de
          preparar.
        </p>
      ) : null}
      {state.release.data ? (
        <EvaluationPreparation
          release={state.release.data}
          unavailable={state.release.isError || state.release.isFetching}
        />
      ) : null}
      <section className="space-y-4" aria-label="Planos de avaliação">
        <h2 className="font-display text-2xl">Planos congelados</h2>
        {state.plans.isPending ? <p role="status">Carregando planos…</p> : null}
        {state.plans.isError ? (
          <p role="alert">Não foi possível consultar os planos.</p>
        ) : null}
        {state.plans.isSuccess && !state.items.length ? (
          <p>Nenhum plano preparado para este dataset.</p>
        ) : null}
        {state.items.map((plan) => (
          <article key={plan.id} className="space-y-2 rounded-lg border p-4">
            <p>
              {evaluationPipelineLabels[plan.pipeline ?? ""]} ·{" "}
              {splitLabels[plan.split]} · {plan.case_count} casos ·{" "}
              {plan.frozen_at}
            </p>
            <a
              className="break-all underline"
              href={`/backoffice/evaluations/${plan.id}`}
            >
              Consultar plano {plan.id}
            </a>
          </article>
        ))}
        {state.plans.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.more}
            disabled={state.plans.isFetching}
          >
            Carregar mais planos
          </Button>
        ) : null}
      </section>
    </div>
  );
}
function EvaluationPreparation({
  release,
  unavailable,
}: {
  release: DatasetRelease;
  unavailable: boolean;
}) {
  const state = useEvaluationPreparation(release, unavailable),
    {
      register,
      formState: { errors },
    } = state.form;
  return (
    <section
      className="space-y-4 rounded-lg border p-5"
      aria-label="Preparar avaliação"
    >
      <h2 className="font-display text-2xl">1. Preparar plano</h2>
      <p>
        O plano inclui todos os casos do conjunto escolhido. Um limite menor
        impede a preparação; não corta a amostra.
      </p>
      {!release.eligible ||
      release.withdrawn ||
      release.manifest.purpose !== "evaluation" ? (
        <p role="alert">
          Dataset indisponível para preparar avaliação. Consulte elegibilidade e
          finalidade.
        </p>
      ) : null}
      <form
        onSubmit={state.prepare}
        onChangeCapture={state.change}
        className="space-y-5"
      >
        <fieldset
          disabled={state.locked || state.preview.isPending}
          className="grid gap-4 sm:grid-cols-2"
        >
          <legend className="sr-only">Conjunto e limites da avaliação</legend>
          <Field>
            <FieldLabel htmlFor="evaluation-pipeline">Avaliação</FieldLabel>
            <select
              id="evaluation-pipeline"
              {...register("pipeline")}
              className="bg-background rounded-md border px-3 py-2"
            >
              {Object.entries(evaluationPipelineLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <p className="text-muted-foreground text-sm">
              A/B/C avaliam somente o tipo do ato e exigem contexto comercial
              completo. Após congelar o plano, confira a disponibilidade e
              confirme a execução na próxima tela.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="evaluation-split">Conjunto</FieldLabel>
            <select
              id="evaluation-split"
              {...register("split")}
              className="bg-background rounded-md border px-3 py-2"
            >
              <option value="validation">
                Validação ({release.manifest.split_counts.validation})
              </option>
              <option value="train">
                Treino ({release.manifest.split_counts.train})
              </option>
            </select>
            <p className="text-muted-foreground text-sm">
              O conjunto de teste permanece fechado para esta operação.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="evaluation-cases">Limite de casos</FieldLabel>
            <Input
              id="evaluation-cases"
              type="number"
              min={1}
              max={1000}
              {...register("limits.max_cases", { valueAsNumber: true })}
              aria-invalid={!!errors.limits?.max_cases}
            />
            {errors.limits?.max_cases ? (
              <p role="alert">Informe de 1 a 1000 casos.</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="evaluation-calls">
              Limite de chamadas de IA
            </FieldLabel>
            <Input
              id="evaluation-calls"
              type="number"
              min={0}
              max={1000}
              {...register("limits.max_http_calls", { valueAsNumber: true })}
              aria-invalid={!!errors.limits?.max_http_calls}
            />
            {errors.limits?.max_http_calls ? (
              <p role="alert">Informe de 0 a 1000 chamadas.</p>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="evaluation-tokens">
              Limite total de tokens de saída
            </FieldLabel>
            <Input
              id="evaluation-tokens"
              type="number"
              min={0}
              max={16000000}
              {...register("limits.max_output_tokens", { valueAsNumber: true })}
              aria-invalid={!!errors.limits?.max_output_tokens}
            />
            {errors.limits?.max_output_tokens ? (
              <p role="alert">Informe de 0 a 16.000.000 tokens.</p>
            ) : null}
          </Field>
        </fieldset>
        <p className="text-muted-foreground text-sm">
          Concorrência: uma chamada por vez. Os limites de tokens são de saída;
          não representam um teto em dinheiro.
        </p>
        <Button
          type="submit"
          variant="outline"
          disabled={!state.canPrepare || state.preview.isPending}
        >
          {state.preview.isPending
            ? "Preparando…"
            : "Conferir plano sem executar IA"}
        </Button>
        {state.current ? (
          <>
            <EvaluationPreviewView preview={state.current} />
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                name="confirmation"
                checked={state.confirmed}
                onChange={state.confirm}
                disabled={
                  state.locked || state.preview.isPending || !state.canPrepare
                }
              />
              <span>
                Conferi o conjunto, o modelo e os limites deste plano.
              </span>
            </label>
            <Button
              type="button"
              onClick={state.freeze}
              disabled={
                !state.canPrepare || state.preview.isPending || !state.confirmed
              }
            >
              Congelar plano
            </Button>
          </>
        ) : null}
      </form>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <div className="space-y-2">
          <p>
            Envio sem confirmação. Recupere o mesmo pedido antes de criar outro
            plano.
          </p>
          <Button
            onClick={state.recover}
            disabled={state.write.mutation.isPending}
          >
            Recuperar criação do plano
          </Button>
        </div>
      ) : null}
      {state.write.mutation.data ? (
        <p role="status">
          Plano congelado.{" "}
          <a
            className="underline"
            href={`/backoffice/evaluations/${state.write.mutation.data.id}`}
          >
            Conferir plano congelado
          </a>
        </p>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </section>
  );
}
export function EvaluationPreviewView({
  preview: p,
}: {
  preview: EvaluationPreview;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="font-medium">
        {splitLabels[p.selection.split]} · {p.case_count} casos ·{" "}
        {p.origin === "synthetic" ? "Dados sintéticos" : "Dados reais"}
      </p>
      <p>{evaluationPipelineLabels[p.selection.pipeline ?? ""]}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Modelo congelado</dt>
          <dd className="break-all">
            {p.route?.model ??
              p.type_route?.policy?.model ??
              "Sem modelo de IA"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Operação</dt>
          <dd className="break-all">
            {p.route?.task ?? "deadline.classify_type"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Chamadas previstas / limite</dt>
          <dd>
            {p.planned_http_calls} / {p.selection.limits.max_http_calls}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            Tokens de saída reserváveis / limite
          </dt>
          <dd>
            {p.planned_output_tokens} / {p.selection.limits.max_output_tokens}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Limite de saída por chamada</dt>
          <dd>
            {p.route?.max_tokens ?? p.type_route?.policy?.max_tokens ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Concorrência</dt>
          <dd>1 chamada por vez</dd>
        </div>
      </dl>
      <details>
        <summary className="cursor-pointer text-sm">
          Identidade e versões do plano
        </summary>
        <p className="text-xs break-all">Definição: {p.digest}</p>
        <p className="text-xs break-all">Rota: {p.route_digest}</p>
        <p className="text-xs break-all">
          Versão: {p.route?.prompt_version ?? p.type_route?.version} ·
          Avaliador: {p.evaluator_version}
        </p>
      </details>
    </div>
  );
}
