"use client";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  useFeedbackMetrics,
  useFeedbackMetricsScopes,
} from "../hooks/use-feedback-metrics";
import type { FeedbackMetricScope } from "../services/feedback-metrics";

export function FeedbackMetricsScopes() {
  const s = useFeedbackMetricsScopes();
  if (!s.allowed)
    return <p role="alert">Seu acesso não inclui leitura de feedback.</p>;
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/backoffice" className="text-sm underline">
        Voltar à bancada
      </Link>
      <h1 className="font-display text-3xl">Feedback das ações de IA</h1>
      <p className="text-muted-foreground">
        Consulte sinais de utilidade nos recortes autorizados. Votos e correções
        não são gabaritos jurídicos.
      </p>
      <Button
        variant="outline"
        onClick={s.refresh}
        disabled={s.query.isFetching}
      >
        Atualizar recortes
      </Button>
      {s.query.isFetching ? (
        <p role="status">Consultando autorizações…</p>
      ) : null}
      {s.query.isError ? (
        <p role="alert">
          Não foi possível consultar os recortes. Atualize para verificar seu
          acesso.
        </p>
      ) : null}
      {s.query.isSuccess && !s.query.isFetching && !s.scopes.length ? (
        <p>
          Nenhum recorte autorizado. A concessão exige uma política de uso
          registrada pela administração.
        </p>
      ) : null}
      <div className="space-y-3">
        {s.scopes.map((scope) => (
          <article key={scope.id} className="space-y-3 rounded-lg border p-5">
            <h2 className="font-medium">{scope.name}</h2>
            <p>
              Dados autorizados de {scope.period_start} a {scope.period_end}, em
              UTC.
            </p>
            <Link
              href={`/backoffice/feedback/${scope.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Consultar métricas de {scope.name}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export function FeedbackMetricsPage({ id }: { id: string }) {
  const s = useFeedbackMetricsScopes(id);
  if (!s.allowed)
    return <p role="alert">Seu acesso não inclui leitura de feedback.</p>;
  return (
    <div className="space-y-6">
      <Link href="/backoffice/feedback" className="text-sm underline">
        Voltar aos recortes de feedback
      </Link>
      {s.query.isFetching ? <p role="status">Conferindo autorização…</p> : null}
      {s.query.isError ||
      (s.query.isSuccess && !s.query.isFetching && !s.scope) ? (
        <p role="alert">
          Recorte indisponível. Ele pode ter vencido ou sido revogado.
        </p>
      ) : null}
      <Button
        variant="outline"
        onClick={s.refresh}
        disabled={s.query.isFetching}
      >
        Revalidar acesso
      </Button>
      {s.scope ? (
        <MetricsReport
          key={`${s.scope.id}:${s.scope.revision}`}
          scope={s.scope}
        />
      ) : null}
    </div>
  );
}
function MetricsReport({ scope }: { scope: FeedbackMetricScope }) {
  const s = useFeedbackMetrics(scope);
  return (
    <div className="max-w-5xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">{scope.name}</h1>
        <p className="text-muted-foreground">
          Atividade em até 31 dias UTC. Cada voto usa o estado corrente; o
          período filtra sua última alteração, sem reconstruir um retrato
          histórico.
        </p>
        <p className="text-sm">
          Contagens exigem pelo menos {scope.minimum_contributors}{" "}
          contribuidores por versão. Política na revisão {scope.revision}.
        </p>
      </header>
      <form onSubmit={s.submit} className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="metrics-from">De (UTC)</Label>
          <Input
            id="metrics-from"
            type="date"
            min={scope.period_start}
            max={scope.period_end}
            {...s.form.register("from")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="metrics-to">Até (UTC)</Label>
          <Input
            id="metrics-to"
            type="date"
            min={scope.period_start}
            max={scope.period_end}
            {...s.form.register("to")}
          />
        </div>
        <Button type="submit" disabled={s.query.isFetching}>
          Consultar métricas
        </Button>
        <p role="alert" className="basis-full">
          {s.form.formState.errors.from?.message ??
            s.form.formState.errors.to?.message ??
            s.form.formState.errors.root?.message}
        </p>
      </form>
      {s.query.isFetching ? (
        <p role="status">Calculando os totais autorizados…</p>
      ) : null}
      {s.query.isError ? (
        <div role="alert" className="space-y-3">
          <p>
            Relatório indisponível. Revalide o acesso ou reduza o período;
            nenhum total anterior está sendo exibido.
          </p>
          <Button variant="outline" onClick={s.refresh}>
            Tentar consultar novamente
          </Button>
        </div>
      ) : null}
      {s.report ? (
        <div className="space-y-5">
          <p>
            Período consultado: {s.report.period_start} a {s.report.period_end}.
            Leitura: {s.report.as_of}.
          </p>
          {!s.rows.length ? (
            <p>Nenhum resultado elegível com atividade nesse período.</p>
          ) : null}
          {s.rows.map((row) => (
            <article key={row.key} className="space-y-4 rounded-lg border p-5">
              <h2 className="font-medium wrap-anywhere">
                {row.task_key} · {row.target_kind}
              </h2>
              <p className="text-muted-foreground text-sm wrap-anywhere">
                Modelo resolvido: {row.resolved_model} · Prompt:{" "}
                {row.prompt_version} · Roteamento: {row.routing_policy} ·
                Recibo: {row.evidence_version}
              </p>
              {row.counts ? (
                <>
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {row.metrics.map((metric) => (
                      <div key={metric.label}>
                        <dt className="text-muted-foreground text-sm">
                          {metric.label}
                        </dt>
                        <dd className="text-xl font-medium">{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    Participação entre pares com exposição: {row.participation}.
                  </p>
                  <p>
                    Maior contribuição individual entre votos ativos:{" "}
                    {row.concentration}.
                  </p>
                </>
              ) : (
                <p>Contagens ocultas: mínimo de contribuidores não atingido.</p>
              )}
            </article>
          ))}
          <p className="text-muted-foreground text-sm">
            Exposição é uma observação do navegador, sujeita a perdas; ausência
            de voto não significa Não. Somar observações diárias não mede
            pessoas únicas. Estes sinais não avaliam correção jurídica nem
            autorizam treinamento.
          </p>
        </div>
      ) : null}
    </div>
  );
}
