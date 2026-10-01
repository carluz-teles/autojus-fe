"use client";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  useFeedbackCurationScopes,
  useFeedbackQueue,
  useFeedbackQueuePreparation,
} from "../hooks/use-feedback-queues";
import {
  type FeedbackCurationScope,
  feedbackQueueChannels,
} from "../services/feedback-queues";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function FeedbackQueueScopes() {
  const s = useFeedbackCurationScopes();
  if (!s.allowed)
    return <p role="alert">Seu acesso não inclui seleção para curadoria.</p>;
  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/backoffice" className="underline">
        Voltar à bancada
      </Link>
      <h1 className="font-display text-3xl">Casos de interesse para revisão</h1>
      <p>
        Combine exemplos aleatórios, correções, avaliações negativas e
        positivas. A seleção indica interesse; cada caso ainda exige admissão e
        revisão jurídica.
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
          Recortes indisponíveis. Atualize para conferir seu acesso.
        </p>
      ) : null}
      {s.query.isSuccess && !s.query.isFetching && !s.scopes.length ? (
        <p>
          Nenhum recorte autorizado para casos individuais. A autorização de
          métricas não permite gerar filas.
        </p>
      ) : null}
      {s.scopes.map((scope) => (
        <article key={scope.id} className="space-y-3 rounded-lg border p-5">
          <h2 className="font-medium wrap-anywhere">{scope.name}</h2>
          <p>
            {scope.period_start} a {scope.period_end} (UTC).
          </p>
          <Link
            href={`/backoffice/feedback-queues/scopes/${scope.id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Preparar fila de {scope.name}
          </Link>
        </article>
      ))}
    </div>
  );
}
export function FeedbackQueueScopePage({ id }: { id: string }) {
  const s = useFeedbackCurationScopes(id);
  if (!s.allowed)
    return <p role="alert">Seu acesso não inclui seleção para curadoria.</p>;
  return (
    <div className="space-y-6">
      <Link href="/backoffice/feedback-queues" className="underline">
        Voltar aos recortes de seleção
      </Link>
      {s.query.isFetching ? <p role="status">Conferindo autorização…</p> : null}
      {s.query.isError ||
      (s.query.isSuccess && !s.query.isFetching && !s.scope) ? (
        <p role="alert">
          Recorte indisponível. Confira se a concessão continua ativa.
        </p>
      ) : null}
      {!s.scope ? (
        <Button
          variant="outline"
          onClick={s.refresh}
          disabled={s.query.isFetching}
        >
          Revalidar acesso
        </Button>
      ) : null}
      {s.scope ? (
        <FeedbackQueuePreparation
          key={`${s.scope.id}:${s.scope.revision}`}
          scope={s.scope}
          refreshScope={s.refresh}
        />
      ) : null}
    </div>
  );
}
function FeedbackQueuePreparation({
  scope,
  refreshScope,
}: {
  scope: FeedbackCurationScope;
  refreshScope: () => void;
}) {
  const s = useFeedbackQueuePreparation(scope);
  return (
    <div className="max-w-5xl space-y-6">
      <Button variant="outline" onClick={refreshScope} disabled={s.locked}>
        Revalidar acesso
      </Button>
      <h1 className="font-display text-3xl wrap-anywhere">{scope.name}</h1>
      <p>
        Reserve ao menos um resultado por canal, somando até 100. A parcela
        aleatória vem primeiro. Correções, negativos e positivos usam os
        resultados restantes; faltas ficam registradas.
      </p>
      <form onSubmit={s.submit} className="space-y-4">
        <fieldset disabled={s.locked} className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 font-medium">
            Período de até 31 dias UTC e cotas da seleção
          </legend>
          <div className="space-y-2">
            <Label htmlFor="queue-from">De (UTC)</Label>
            <Input
              id="queue-from"
              type="date"
              min={scope.period_start}
              max={scope.period_end}
              {...s.form.register("from")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="queue-to">Até (UTC)</Label>
            <Input
              id="queue-to"
              type="date"
              min={scope.period_start}
              max={scope.period_end}
              {...s.form.register("to")}
            />
          </div>
          {feedbackQueueChannels.map((c) => (
            <div key={c.key} className="space-y-2">
              <Label htmlFor={`quota-${c.key}`}>{c.label}</Label>
              <Input
                id={`quota-${c.key}`}
                type="number"
                min={1}
                max={100}
                {...s.form.register(`quotas.${c.key}`, { valueAsNumber: true })}
              />
            </div>
          ))}
        </fieldset>
        <p role="alert">
          {s.form.formState.errors.root?.message ??
            s.form.formState.errors.to?.message ??
            s.form.formState.errors.quotas?.message}
        </p>
        <Button type="submit" disabled={s.locked}>
          Gerar fila de interesse
        </Button>
      </form>
      {s.write.mutation.isPending ? (
        <p role="status">Registrando seleção…</p>
      ) : null}
      {s.write.uncertain ? (
        <div role="alert" className="space-y-3">
          <p>
            O envio pode ter sido salvo. Confirme o mesmo comando antes de
            iniciar outra seleção.
          </p>
          <Button onClick={s.recover} disabled={s.write.mutation.isPending}>
            Recuperar envio
          </Button>
        </div>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">Filas na política atual</h2>
        <Button
          variant="outline"
          onClick={s.list.refresh}
          disabled={s.list.query.isFetching}
        >
          Atualizar filas
        </Button>
        {s.list.query.isError ? (
          <p role="alert">Não foi possível consultar as filas.</p>
        ) : null}
        {s.list.query.isSuccess &&
        !s.list.query.isFetching &&
        !s.list.rows.length ? (
          <p>Nenhuma fila registrada nesta política.</p>
        ) : null}
        {s.list.rows.map((q) => (
          <article key={q.id} className="space-y-2 rounded-lg border p-4">
            <p>
              {q.from} a {q.to} · {q.selected_count} resultados selecionados
            </p>
            <Link
              className="underline"
              href={`/backoffice/feedback-queues/${q.id}`}
            >
              Consultar fila {q.id}
            </Link>
          </article>
        ))}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={s.list.previous}
            disabled={!s.list.hasPrevious || s.list.query.isFetching}
          >
            Anteriores
          </Button>
          <Button
            variant="outline"
            onClick={s.list.next}
            disabled={!s.list.hasNext || s.list.query.isFetching}
          >
            Próximas
          </Button>
        </div>
      </section>
      <AnnotationNavigationDialog navigation={s.navigation} />
    </div>
  );
}
export function FeedbackQueuePage({ id }: { id: string }) {
  const s = useFeedbackQueue(id);
  if (!s.allowed)
    return <p role="alert">Seu acesso não inclui seleção para curadoria.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/backoffice/feedback-queues" className="underline">
        Voltar aos recortes de seleção
      </Link>
      <h1 className="font-display text-3xl">Fila de interesse</h1>
      <Button
        variant="outline"
        onClick={s.refresh}
        disabled={s.query.isFetching}
      >
        Revalidar fila
      </Button>
      {s.query.isFetching ? (
        <p role="status">Conferindo fila e fontes…</p>
      ) : null}
      {s.query.isError ? (
        <p role="alert">
          Fila indisponível. A política pode ter mudado ou o acesso ter sido
          revogado.
        </p>
      ) : null}
      {s.queue ? (
        <>
          <p>
            {s.queue.selected_count} selecionados entre{" "}
            {s.queue.population_count} resultados elegíveis de {s.queue.from} a{" "}
            {s.queue.to}. Leitura congelada em {s.queue.frozen_at}.
          </p>
          <p>
            Os sinais abaixo são os da seleção. Votos posteriores não mudam este
            recibo. A disponibilidade da fonte é conferida novamente ao
            consultar.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            {s.channels.map((c) => (
              <div key={c.key} className="rounded-lg border p-4">
                <dt className="font-medium">{c.label}</dt>
                <dd>
                  {c.selected} de {c.requested} solicitados · {c.missing} não
                  preenchidos
                </dd>
              </div>
            ))}
          </dl>
          {s.items.map((item) => (
            <article
              key={item.result_id}
              className="space-y-2 rounded-lg border p-5"
            >
              <h2 className="font-medium wrap-anywhere">
                {item.task_key} · {item.channelLabel}
              </h2>
              <p>
                Sim: {item.yes_votes} · Não: {item.no_votes} · Correções:{" "}
                {item.corrections}
              </p>
              <p className="text-sm wrap-anywhere">
                Resultado: {item.result_id}
              </p>
              <p>
                {item.available
                  ? "Fonte disponível para a próxima etapa de admissão."
                  : "Fonte indisponível. Este resultado não pode ser admitido."}
              </p>
            </article>
          ))}
          <details>
            <summary>Recibo da seleção</summary>
            <div className="space-y-2 py-3 text-sm wrap-anywhere">
              <p>Protocolo: {s.queue.algorithm}</p>
              <p>Semente: {s.queue.seed}</p>
              <p>Digest: {s.queue.manifest_digest}</p>
            </div>
          </details>
          <p className="text-muted-foreground">
            Gerar esta fila não admite casos nem aprova respostas.
            Consentimento, sanitização, revisão jurídica e finalidades
            autorizadas continuam obrigatórios antes do uso em datasets.
          </p>
        </>
      ) : null}
    </div>
  );
}
