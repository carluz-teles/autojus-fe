"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Document navigation lets browser Back warn about an unsent protocol form. */

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { usePreparationWorkspace } from "../hooks/use-preparation";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { ProtocolDetails } from "./protocol-page";

export function PreparationWorkspace({ frame }: { frame?: string }) {
  const state = usePreparationWorkspace(frame),
    editor = state.editor;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui preparação de lotes.</p>;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <a href="/backoffice" className="text-sm underline">
          Voltar à bancada
        </a>
        <h1 className="font-display text-3xl">Protocolos e lotes de revisão</h1>
        <p className="text-muted-foreground">
          Congele a orientação jurídica e prepare todos os casos selecionados da
          amostra para revisão humana.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <a
          href="/backoffice/preparation/protocols/new"
          className={buttonVariants()}
        >
          Criar protocolo
        </a>
        <a
          href="/backoffice/sampling"
          className={buttonVariants({ variant: "outline" })}
        >
          Consultar amostras
        </a>
        <Button
          variant="outline"
          onClick={state.refresh}
          disabled={editor.locked}
        >
          Atualizar preparação
        </Button>
      </div>
      <section className="space-y-4" aria-label="Protocolos existentes">
        <h2 className="font-display text-2xl">Protocolos congelados</h2>
        {state.protocols.isError ? (
          <p role="alert">Não foi possível carregar protocolos.</p>
        ) : state.protocols.isPending ? (
          <p role="status">Carregando protocolos…</p>
        ) : !state.protocolItems.length ? (
          <p>Crie o primeiro protocolo para preparar um lote.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {state.protocolItems.map((protocol) => (
              <div
                key={protocol.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <p>
                  {protocol.key} · revisão {protocol.revision} ·{" "}
                  {protocol.origin === "synthetic" ? "Sintético" : "Real"} ·{" "}
                  {protocol.matter_key}
                </p>
                <a
                  href={`/backoffice/preparation/protocols/${protocol.id}`}
                  className="text-sm underline"
                >
                  Consultar protocolo {protocol.revision}
                </a>
              </div>
            ))}
          </div>
        )}
        {state.protocols.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreProtocols}
            disabled={state.protocols.isFetchingNextPage}
          >
            Carregar mais protocolos
          </Button>
        ) : null}
      </section>
      <section
        className="space-y-5 rounded-lg border p-5"
        aria-label="Preparar lote"
      >
        <h2 className="font-display text-2xl">Preparar lote de revisão</h2>
        {editor.write.mutation.data ? (
          <div className="space-y-3">
            <p role="status">
              Lote preparado com {editor.write.mutation.data.task_count}{" "}
              tarefas.{" "}
              {editor.write.mutation.data.valid
                ? "Amostra válida nesta consulta."
                : "Amostra invalidada após o envio; histórico preservado."}
            </p>
            <a
              href={`/backoffice/preparation/batches/${editor.write.mutation.data.id}`}
              className={buttonVariants()}
            >
              Consultar e preparar tarefas do lote
            </a>
          </div>
        ) : (
          <form onSubmit={editor.submit} className="space-y-5">
            <fieldset disabled={editor.locked} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="preparation-frame">
                    Amostra congelada
                  </FieldLabel>
                  <NativeSelect
                    id="preparation-frame"
                    {...editor.form.register("frame", {
                      onChange: editor.changeSelection,
                    })}
                  >
                    <NativeSelectOption value="">Selecione</NativeSelectOption>
                    {frame &&
                    !state.frameItems.some((item) => item.id === frame) ? (
                      <NativeSelectOption value={frame}>
                        Amostra recebida · {frame.slice(0, 8)}
                      </NativeSelectOption>
                    ) : null}
                    {state.frameItems.map((item) => (
                      <NativeSelectOption
                        key={item.id}
                        value={item.id}
                        disabled={!item.valid}
                      >
                        {item.lineage_key} · {item.selected_count} casos ·{" "}
                        {item.id.slice(0, 8)}
                        {item.valid ? "" : " · Invalidada"}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor="preparation-protocol">
                    Revisão do protocolo
                  </FieldLabel>
                  <NativeSelect
                    id="preparation-protocol"
                    {...editor.form.register("protocol", {
                      onChange: editor.changeSelection,
                    })}
                  >
                    <NativeSelectOption value="">Selecione</NativeSelectOption>
                    {state.protocolItems.map((item) => (
                      <NativeSelectOption key={item.id} value={item.id}>
                        {item.key} · revisão {item.revision} · {item.matter_key}{" "}
                        · {item.origin === "synthetic" ? "Sintético" : "Real"}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              {state.frames.isError ? (
                <p role="alert">Não foi possível carregar as amostras.</p>
              ) : null}
              {editor.frame.isError || editor.protocol.isError ? (
                <p role="alert">
                  A seleção não pôde ser conferida. Atualize a preparação.
                </p>
              ) : null}
              {editor.frame.data ? (
                <div className="space-y-2">
                  <p>
                    {editor.frame.data.plan.selected_count} casos selecionados,
                    sem escolha de subconjunto. Treino:{" "}
                    {editor.frame.data.plan.split_counts.train}; validação:{" "}
                    {editor.frame.data.plan.split_counts.validation}; teste:{" "}
                    {editor.frame.data.plan.split_counts.test}.
                  </p>
                  <Badge
                    variant={
                      editor.frame.data.valid ? "outline" : "destructive"
                    }
                  >
                    {editor.frame.data.valid
                      ? "Amostra válida"
                      : "Amostra invalidada"}
                  </Badge>
                  <p>
                    <a
                      href={`/backoffice/sampling/${editor.frame.data.id}`}
                      className="text-sm underline"
                    >
                      Conferir composição e manifesto da amostra
                    </a>
                  </p>
                </div>
              ) : null}
              {editor.protocol.data ? (
                <ProtocolDetails protocol={editor.protocol.data} />
              ) : null}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  {...editor.form.register("confirmed")}
                  className="accent-primary mt-0.5 size-4 shrink-0"
                />
                <span>
                  Conferi a amostra e esta revisão do protocolo para preparar o
                  lote completo.
                </span>
              </label>
              <Button
                type="submit"
                disabled={editor.frame.isFetching || editor.protocol.isFetching}
              >
                Preparar lote completo
              </Button>
            </fieldset>
          </form>
        )}
        {state.frames.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreFrames}
            disabled={state.frames.isFetchingNextPage}
          >
            Carregar mais amostras
          </Button>
        ) : null}
        {editor.message ? <p role="alert">{editor.message}</p> : null}
        {editor.write.uncertain ? (
          <div role="alert" className="space-y-3">
            <p>
              O lote pode ter sido preparado. Recupere o envio antes de criar
              outro.
            </p>
            <Button
              onClick={editor.recover}
              disabled={editor.write.mutation.isPending}
            >
              Recuperar lote enviado
            </Button>
          </div>
        ) : null}
      </section>
      <section className="space-y-4" aria-label="Lotes existentes">
        <h2 className="font-display text-2xl">Lotes preparados</h2>
        {state.batches.isError ? (
          <p role="alert">Não foi possível carregar lotes.</p>
        ) : state.batches.isPending ? (
          <p role="status">Carregando lotes…</p>
        ) : !state.batchItems.length ? (
          <p>Nenhum lote preparado.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {state.batchItems.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <p>
                  {batch.task_count} tarefas ·{" "}
                  {batch.valid ? "Amostra válida" : "Amostra invalidada"} ·{" "}
                  {batch.id.slice(0, 8)}
                </p>
                <a
                  href={`/backoffice/preparation/batches/${batch.id}`}
                  className="text-sm underline"
                >
                  Consultar lote {batch.id.slice(0, 8)}
                </a>
              </div>
            ))}
          </div>
        )}
        {state.batches.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreBatches}
            disabled={state.batches.isFetchingNextPage}
          >
            Carregar mais lotes
          </Button>
        ) : null}
      </section>
      <AnnotationNavigationDialog navigation={editor.navigation} />
    </div>
  );
}
