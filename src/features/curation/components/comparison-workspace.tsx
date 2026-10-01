"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";

import { useComparisonWorkspace } from "../hooks/use-comparisons";
import { comparisonSourceProblem } from "../services/comparisons";
import { evaluationPipelineLabels } from "../services/evaluation-presentation";
import { splitLabels } from "../services/sampling";
import { ComparisonCommand } from "./comparison-command";
import { ComparisonReport } from "./comparison-report";

export function ComparisonWorkspace({ id }: { id: string }) {
  const s = useComparisonWorkspace(id);
  if (!s.allowed)
    return (
      <p role="alert">
        Comparações exigem permissões de publicação e inferência.
      </p>
    );
  const w = s.workspace;
  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <a
          href={`/backoffice/releases/${id}/evaluations`}
          className="text-sm underline"
        >
          Voltar às avaliações
        </a>
        <h1 className="font-display text-3xl">Comparar tipo do ato</h1>
        <p className="text-muted-foreground">
          {w.release.data?.name ?? "Dataset selecionado"}
        </p>
        <p>
          Compare dois ou três relatórios já emitidos, usando os mesmos casos e
          gabaritos. Esta operação não executa IA.
        </p>
      </header>
      <Button
        variant="outline"
        className="self-start"
        onClick={s.refresh}
        disabled={s.actions.write.mutation.isPending}
      >
        Atualizar relatórios e histórico
      </Button>
      {w.release.isPending || w.plans.isPending ? (
        <p role="status">Carregando dataset e planos…</p>
      ) : null}
      {w.release.isError || w.plans.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            Não foi possível atualizar o dataset ou seus planos.
          </AlertDescription>
        </Alert>
      ) : null}
      {w.release.data &&
      (!w.release.data.eligible || w.release.data.withdrawn) ? (
        <Alert>
          <AlertDescription>
            O dataset não está elegível para novas comparações.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>1. Escolher relatórios</h2>
          </CardTitle>
          <CardDescription>
            Selecione os planos que deseja comparar. O primeiro é a referência
            inicial; você pode trocar a ordem abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <FieldSet disabled={s.actions.locked}>
            <FieldLegend className="sr-only">Planos disponíveis</FieldLegend>
            <FieldGroup>
              {w.items
                .filter((p) => !!p.pipeline)
                .map((plan) => {
                  const checked = s.selected.some((p) => p.id === plan.id);
                  const disabled =
                    s.actions.locked || (!checked && s.selected.length === 3);
                  return (
                    <Field
                      key={plan.id}
                      orientation="horizontal"
                      data-disabled={disabled}
                    >
                      <Checkbox
                        id={`choose-${plan.id}`}
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => s.toggle(plan)}
                      />
                      <FieldContent>
                        <FieldLabel htmlFor={`choose-${plan.id}`}>
                          {evaluationPipelineLabels[plan.pipeline ?? ""]} ·{" "}
                          {splitLabels[plan.split]}
                        </FieldLabel>
                        <FieldDescription>
                          {plan.case_count} casos ·{" "}
                          {new Date(plan.frozen_at).toLocaleString("pt-BR")}
                        </FieldDescription>
                        <a
                          className="w-fit text-sm underline"
                          href={`/backoffice/evaluations/${plan.id}`}
                        >
                          Consultar plano {plan.id.slice(-8)}
                        </a>
                      </FieldContent>
                    </Field>
                  );
                })}
            </FieldGroup>
          </FieldSet>
          {w.plans.isSuccess && !w.items.some((p) => !!p.pipeline) ? (
            <p>
              Nenhum plano de tipo do ato nesta página. Prepare e execute um
              plano A/B/C para emitir seu relatório.
            </p>
          ) : null}
          {w.plans.hasNextPage ? (
            <Button
              variant="outline"
              className="self-start"
              onClick={w.more}
              disabled={w.plans.isFetching}
            >
              Carregar mais planos
            </Button>
          ) : null}
          {s.selected.length ? (
            <section
              aria-label="Fontes selecionadas"
              className="flex flex-col gap-4"
            >
              <h3 className="font-medium">Ordem da comparação</h3>
              {s.selected.map((plan, i) => {
                const q = s.sources[i];
                const problem = q.isSuccess
                  ? comparisonSourceProblem(q.data)
                  : null;
                return (
                  <div key={plan.id} className="flex flex-col gap-2">
                    <p className="font-medium">
                      Fonte {i + 1}
                      {i === 0 ? " · Referência inicial" : ""}:{" "}
                      {evaluationPipelineLabels[plan.pipeline ?? ""]}
                    </p>
                    {q.isPending || q.isFetching ? (
                      <p role="status">Conferindo relatório…</p>
                    ) : null}
                    {q.isError ? (
                      <p role="alert">
                        Não foi possível consultar esta fonte. Atualize para
                        tentar novamente.
                      </p>
                    ) : null}
                    {problem ? (
                      <p role="alert">
                        {problem}{" "}
                        <a
                          className="underline"
                          href={`/backoffice/evaluations/${plan.id}`}
                        >
                          Abrir avaliação
                        </a>
                      </p>
                    ) : null}
                    {q.isSuccess && !problem && q.data.report ? (
                      <p className="text-muted-foreground text-sm">
                        Relatório disponível · {q.data.report.case_count} casos
                        ·{" "}
                        {new Date(q.data.report.generated_at).toLocaleString(
                          "pt-BR",
                        )}
                      </p>
                    ) : null}
                    {i > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="self-start"
                        disabled={s.actions.locked}
                        onClick={() => s.reference(plan.id)}
                      >
                        Usar fonte {i + 1} como referência
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </section>
          ) : null}
          {!s.sameSplit ? (
            <Alert variant="destructive">
              <AlertDescription>
                Escolha relatórios do mesmo conjunto: treino ou validação.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>2. Abrir comparação</h2>
          </CardTitle>
          <CardDescription>
            Consultar métricas registra sua exposição aos gabaritos. Um caso
            exposto deixa de ser elegível para sua anotação cega.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ComparisonCommand
            actions={s.actions}
            context={s.context}
            enabled={s.canCreate}
            submit={s.create}
            label="Comparar relatórios"
          />
        </CardContent>
      </Card>
      {s.actions.metadata.isError ? (
        <p role="alert">
          Não foi possível conferir o acesso à comparação. Atualize antes de
          abrir seus resultados.
        </p>
      ) : null}
      {s.actions.delivery ? (
        <ComparisonReport delivery={s.actions.delivery} />
      ) : null}
      <section
        aria-label="Histórico de comparações"
        className="flex flex-col gap-4"
      >
        <h2 className="font-display text-2xl">Comparações registradas</h2>
        {s.history.isPending ? (
          <p role="status">Carregando histórico…</p>
        ) : null}
        {s.history.isError ? (
          <p role="alert">Não foi possível consultar o histórico.</p>
        ) : null}
        {s.history.isSuccess && !s.historyItems.length ? (
          <p>Nenhuma comparação registrada.</p>
        ) : null}
        {s.historyItems.map((m) => (
          <article key={m.id} className="flex flex-col gap-1">
            <a href={`/backoffice/comparisons/${m.id}`} className="underline">
              Comparação de {new Date(m.created_at).toLocaleString("pt-BR")} ·{" "}
              {m.id.slice(-8)}
            </a>
            <p className="text-muted-foreground text-sm">
              {splitLabels[m.split]} · {m.source_count} relatórios ·{" "}
              {m.case_count} casos
            </p>
          </article>
        ))}
        {s.history.hasNextPage ? (
          <Button
            className="self-start"
            variant="outline"
            disabled={s.history.isFetching}
            onClick={s.moreHistory}
          >
            Carregar mais comparações
          </Button>
        ) : null}
      </section>
    </div>
  );
}
