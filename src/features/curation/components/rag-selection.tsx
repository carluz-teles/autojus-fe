"use client";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import type { useInference } from "../hooks/use-inference";
import { AnnotationAnswerPreview } from "./annotation-answer";

export function RAGSelection({
  state,
  taskId,
}: {
  state: ReturnType<typeof useInference>["rag"];
  taskId: string;
}) {
  if (!state.enabled) return null;
  return (
    <section
      className="flex flex-col gap-3 rounded-lg border p-4"
      aria-label="Exemplos revisados para esta hipótese"
    >
      <h4 className="font-medium">Consultar exemplos revisados</h4>
      <p className="text-muted-foreground text-sm">
        Opcional. A busca vetorial usa voyage-4 e pode consumir embeddings. Os
        exemplos são de outros casos e não substituem a análise jurídica.
      </p>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`rag-release-${taskId}`}>
            Dataset de exemplos
          </FieldLabel>
          <NativeSelect
            id={`rag-release-${taskId}`}
            value={state.selected}
            onChange={state.changeRelease}
            disabled={state.locked}
            className="w-full"
          >
            <NativeSelectOption value="">
              Sem exemplos revisados
            </NativeSelectOption>
            {state.items.map((r) => (
              <NativeSelectOption key={r.id} value={r.id}>
                {r.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={state.refresh}
          disabled={state.locked}
        >
          Atualizar datasets
        </Button>
        {state.releases.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            onClick={state.more}
            disabled={state.releases.isFetching || state.locked}
          >
            Carregar mais datasets
          </Button>
        ) : null}
      </div>
      {state.releases.isError ? (
        <p role="alert">Não foi possível consultar os datasets.</p>
      ) : null}
      {state.selected ? (
        <>
          {state.availability.isPending ? (
            <p role="status">Conferindo índice…</p>
          ) : null}
          {state.availability.isError ? (
            <p role="alert">{state.availability.error.message}</p>
          ) : null}
          {state.availability.data &&
          !state.canSearch &&
          !state.result &&
          !state.locked ? (
            <p>
              Este índice ainda não está disponível para consulta. Confira o
              dataset na área de publicações.
            </p>
          ) : null}
          <FieldGroup>
            <Field orientation="horizontal">
              <input
                id={`rag-search-${taskId}`}
                type="checkbox"
                {...state.form.register("confirmed")}
                disabled={!state.canSearch}
              />
              <FieldLabel htmlFor={`rag-search-${taskId}`}>
                Confirmo a busca de até três exemplos, com limite de 128 KiB, e
                a exposição aos gabaritos recuperados.
              </FieldLabel>
            </Field>
            <Button
              type="button"
              onClick={state.search}
              disabled={!state.canSearch}
            >
              Buscar exemplos semelhantes
            </Button>
          </FieldGroup>
        </>
      ) : null}
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.mutation.error ? (
        <p role="alert">{state.write.mutation.error.message}</p>
      ) : null}
      {state.write.uncertain ? (
        <Button
          type="button"
          onClick={state.recover}
          disabled={state.write.mutation.isPending}
        >
          Recuperar busca enviada
        </Button>
      ) : null}
      {state.result?.state === "empty" ? (
        <p role="status">
          Nenhum exemplo elegível. A hipótese pode continuar sem exemplos.
        </p>
      ) : null}
      {state.result &&
      (state.result.state === "dispatched" ||
        state.result.state === "uncertain") ? (
        <div className="flex flex-col gap-2">
          <p role="status">
            Embeddings sem resultado confirmado. A tentativa não será repetida
            automaticamente.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={state.inspectAttempt}
            disabled={state.locked}
          >
            Consultar tentativa enviada
          </Button>
        </div>
      ) : null}
      {state.result?.state === "ready" ? (
        <div className="flex flex-col gap-3">
          <p role="status">
            {state.result.matches.length} exemplo(s) serão usados nesta
            hipótese. Tokens informados:{" "}
            {state.result.total_tokens ?? "desconhecidos"}.
          </p>
          {state.result.matches.map((m) => (
            <details key={m.gold_id} className="rounded-lg border p-3">
              <summary className="cursor-pointer">
                Exemplo revisado · similaridade {m.score} ·{" "}
                {m.example.origin === "synthetic" ? "sintético" : "real"}
              </summary>
              <p className="my-3 break-words whitespace-pre-wrap">{m.text}</p>
              <AnnotationAnswerPreview annotation={m.example.annotation} />
            </details>
          ))}
        </div>
      ) : null}
    </section>
  );
}
