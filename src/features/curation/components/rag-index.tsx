"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

import { useRAGIndex } from "../hooks/use-rag";
import type { DatasetRelease } from "../services/dataset-releases";
import { ragStateLabel } from "../services/rag";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function RAGIndexPanel({
  release,
  loading,
}: {
  release: DatasetRelease;
  loading: boolean;
}) {
  const state = useRAGIndex(release, loading);
  if (!state.allowed) return null;
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border p-5"
      aria-label="Índice de exemplos revisados"
    >
      <h2 className="font-display text-2xl">Exemplos para as sugestões</h2>
      <p>
        Prepare a busca vetorial dos exemplos aprovados deste dataset. Modelo
        voyage-4; até 128 fragmentos e 128 KiB de entradas por índice.
      </p>
      <Button variant="outline" onClick={state.refresh} disabled={state.locked}>
        Atualizar índice
      </Button>
      {state.query.isPending ? <p role="status">Consultando índice…</p> : null}
      {state.query.isError ? (
        <p role="alert">{state.query.error.message}</p>
      ) : null}
      {state.query.data?.enabled === false ? (
        <p>Indexação desativada neste ambiente.</p>
      ) : null}
      {state.index && !state.query.isError ? (
        <div className="flex flex-col gap-2 text-sm" role="status">
          <p>
            {ragStateLabel(state.index)} · {state.index.chunk_count} fragmentos
          </p>
          <p>
            Tokens informados: {state.index.total_tokens ?? "desconhecidos"}.
            Uma reserva não confirma cobrança.
          </p>
          {!state.index.eligible ? (
            <p>Dataset inelegível: uso dos exemplos bloqueado.</p>
          ) : null}
          {state.index.embedding_state !== "ready" ? (
            <p>
              A tentativa não será repetida automaticamente. Atualize o estado
              antes de investigar o recibo.
            </p>
          ) : null}
        </div>
      ) : null}
      <form onSubmit={state.submit}>
        <FieldGroup>
          <Field orientation="horizontal">
            <input
              id={`rag-confirm-${release.id}`}
              type="checkbox"
              {...state.form.register("confirmed")}
              disabled={!state.canBuild}
            />
            <FieldLabel htmlFor={`rag-confirm-${release.id}`}>
              Conferi o dataset e autorizo esta tentativa limitada de
              embeddings.
            </FieldLabel>
          </Field>
          <Button type="submit" disabled={!state.canBuild}>
            {state.index ? "Concluir indexação" : "Indexar exemplos aprovados"}
          </Button>
        </FieldGroup>
      </form>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.mutation.error ? (
        <p role="alert">{state.write.mutation.error.message}</p>
      ) : null}
      {state.write.uncertain ? (
        <Button
          onClick={state.recover}
          disabled={state.write.mutation.isPending}
        >
          Recuperar indexação enviada
        </Button>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </section>
  );
}
