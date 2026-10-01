"use client";

import { Button } from "@/components/ui/button";

import { useInference } from "../hooks/use-inference";
import type { PreparedTask } from "../services/annotation-preparation";
import { inferenceStateLabels } from "../services/inference";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { RAGSelection } from "./rag-selection";

export function InferenceAction({
  task,
  digest,
  valid,
}: {
  task: PreparedTask;
  digest: string;
  valid: boolean;
}) {
  const state = useInference(task, digest, valid);
  if (!state.allowed) return null;
  if (!state.open)
    return (
      <Button variant="outline" onClick={state.openPanel}>
        Conferir inferência de IA
      </Button>
    );
  return (
    <section
      className="space-y-4 rounded-lg border p-4"
      aria-label="Inferência de IA"
    >
      <h3 className="font-medium">Hipótese de tipo e prazo</h3>
      <p className="text-sm">
        Cada nova tentativa pode consumir o provider. A resposta será uma
        hipótese para revisão humana; não altera o prazo do processo.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={state.refresh}>
          Atualizar inferência
        </Button>
        <Button
          variant="ghost"
          onClick={state.closePanel}
          disabled={state.locked}
        >
          Fechar inferência
        </Button>
      </div>
      {state.route.isError ? (
        <p role="alert">{state.route.error.message}</p>
      ) : state.route.data?.enabled === false ? (
        <p>
          Inferência desativada neste ambiente. A sugestão local continua
          disponível.
        </p>
      ) : state.route.data?.route ? (
        <p className="text-sm break-words">
          Modelo: {state.route.data.route.model} · até{" "}
          {state.route.data.route.max_tokens} tokens de saída · no máximo uma
          chamada por tentativa.
        </p>
      ) : (
        <p role="status">Carregando configuração…</p>
      )}
      {state.jobs.isError ? (
        <p role="alert">{state.jobs.error.message}</p>
      ) : null}
      {state.latest ? (
        <div role="status" className="space-y-2 text-sm">
          <p>
            Tentativa {state.latest.attempt}:{" "}
            {inferenceStateLabels[state.latest.state]}
          </p>
          <p className="break-words">
            Modelo desta tentativa: {state.latest.route.model}
          </p>
          <p>
            Custo informado:{" "}
            {state.latest.cost_usd === null
              ? "não determinado"
              : `US$ ${state.latest.cost_usd}`}{" "}
            · Chamadas reservadas:{" "}
            {state.latest.http_calls_reserved ?? "não determinado"}
          </p>
          {state.latest.rag ? (
            <p>
              Exemplos revisados usados: {state.latest.rag.example_count} ·
              voyage-4 · consulta {state.latest.rag.query_id}
            </p>
          ) : null}
          {state.latest.failure_code ? (
            <p>Motivo: {state.latest.failure_code}</p>
          ) : null}
          {state.latest.late_result ? (
            <p>
              Um retorno tardio foi preservado na auditoria e não foi
              disponibilizado como sugestão.
            </p>
          ) : null}
          {state.latest.state === "completed" ? (
            <p>
              A hipótese será mostrada ao reservar uma revisão assistida.
              Reservas anteriores mantêm a sugestão que receberam.
            </p>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={state.submit} className="space-y-3">
        <RAGSelection state={state.rag} taskId={task.id} />
        <fieldset disabled={!state.canSubmit} className="space-y-3">
          <legend className="sr-only">Confirmar nova tentativa</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.confirmed}
              onChange={state.confirm}
              className="mt-1"
            />
            Conferi o modelo e autorizo o consumo desta nova tentativa.
          </label>
          {state.latest?.state === "uncertain" ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.acknowledged}
                onChange={state.acknowledge}
                className="mt-1"
              />
              Entendo que a tentativa anterior pode ter gerado cobrança, mesmo
              sem hipótese disponível.
            </label>
          ) : null}
          <Button type="submit" disabled={!state.canSubmit}>
            Solicitar hipótese de IA
          </Button>
        </fieldset>
      </form>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.mutation.error ? (
        <p role="alert">{state.write.mutation.error.message}</p>
      ) : null}
      {state.write.uncertain ? (
        <Button
          variant="outline"
          onClick={state.recover}
          disabled={state.write.mutation.isPending}
        >
          Recuperar solicitação enviada
        </Button>
      ) : null}
      {state.jobs.data?.length ? (
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Histórico de tentativas
          </summary>
          <ul className="mt-3 space-y-3 text-sm">
            {state.jobs.data.map((job) => (
              <li key={job.id} className="break-words">
                Tentativa {job.attempt} · {inferenceStateLabels[job.state]} ·{" "}
                {job.route.model} · custo{" "}
                {job.cost_usd === null
                  ? "não determinado"
                  : `US$ ${job.cost_usd}`}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </section>
  );
}
