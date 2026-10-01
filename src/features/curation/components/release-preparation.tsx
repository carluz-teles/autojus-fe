"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- Preserve the navigation guard for uncertain commands. */
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { useReleasePreparation } from "../hooks/use-releases";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { ReleaseManifestView } from "./release-manifest";
export function ReleasePreparation({ batch }: { batch: string }) {
  const state = useReleasePreparation(batch),
    { register } = state.form;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui publicação de datasets.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/releases" className="text-sm underline">
          Voltar aos datasets
        </a>
        <h1 className="font-display text-3xl">Preparar dataset</h1>
        <p className="text-muted-foreground">
          Confira o conjunto inteiro antes de congelar suas versões e
          finalidades.
        </p>
      </header>
      {state.write.mutation.data ? (
        <section role="status" className="space-y-4 rounded-lg border p-5">
          <h2 className="font-display text-2xl">Dataset congelado</h2>
          <p>{state.write.mutation.data.name}</p>
          <a
            href={`/backoffice/releases/${state.write.mutation.data.id}`}
            className={buttonVariants()}
          >
            Acompanhar publicação do dataset
          </a>
        </section>
      ) : (
        <form
          onSubmit={state.submit}
          onChange={state.change}
          className="space-y-5"
        >
          <fieldset disabled={state.locked} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="release-name">Nome do dataset</FieldLabel>
                <Input id="release-name" {...register("name")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="release-purpose">
                  Finalidade do dataset
                </FieldLabel>
                <NativeSelect id="release-purpose" {...register("purpose")}>
                  <NativeSelectOption value="evaluation">
                    Avaliação
                  </NativeSelectOption>
                  <NativeSelectOption value="training">
                    Treinamento
                  </NativeSelectOption>
                  <NativeSelectOption value="rag">
                    RAG vetorial
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={state.refresh}
              disabled={state.preview.isFetching}
            >
              Atualizar preview
            </Button>
            {state.preview.isPending ? (
              <p role="status">Conferindo itens…</p>
            ) : null}
            {state.preview.isError ? (
              <p role="alert">
                Não foi possível conferir o lote. Atualize antes de congelar.
              </p>
            ) : null}
            {state.preview.data ? (
              <ReleaseManifestView manifest={state.preview.data.manifest} />
            ) : null}
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                {...register("confirmed")}
                onChange={state.confirm}
              />
              <span>
                Conferi as inclusões, exclusões e a finalidade deste manifesto.
              </span>
            </label>
            <Button
              type="submit"
              disabled={
                state.preview.isFetching ||
                state.preview.isError ||
                !state.preview.data?.manifest.included_count
              }
            >
              Congelar dataset
            </Button>
          </fieldset>
          {state.message ? <p role="alert">{state.message}</p> : null}
          {state.write.uncertain ? (
            <div className="space-y-2">
              <p>O envio ficou sem confirmação. Recupere o mesmo pedido.</p>
              <Button
                type="button"
                onClick={state.recover}
                disabled={state.write.mutation.isPending}
              >
                Recuperar criação do dataset
              </Button>
            </div>
          ) : null}
        </form>
      )}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </div>
  );
}
