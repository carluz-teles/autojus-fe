"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { useImportWorkspace } from "../hooks/use-import-workspace";
import { importFileExample, manualImportFields } from "../services/import-form";
import { importStateLabel } from "../services/imports";

export function ImportWorkspace() {
  const workspace = useImportWorkspace();
  if (!workspace.allowed)
    return <p role="alert">Seu acesso não inclui importação de casos.</p>;
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl">Importar intimações</h1>
        <p className="text-muted-foreground mt-2">
          Prepare os casos e confira a procedência antes da revisão de
          privacidade.
        </p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Novo lote privado</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={workspace.submit}
              noValidate
              className="flex flex-col gap-6"
            >
              <fieldset disabled={workspace.pending} className="contents">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="import-name">Nome do lote</FieldLabel>
                    <Input
                      id="import-name"
                      {...workspace.form.register("name")}
                      aria-invalid={!!workspace.form.formState.errors.name}
                    />
                    <FieldError
                      errors={[workspace.form.formState.errors.name]}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="import-mode">Entrada</FieldLabel>
                    <NativeSelect
                      id="import-mode"
                      {...workspace.form.register("mode")}
                    >
                      <NativeSelectOption value="manual">
                        Colar uma intimação
                      </NativeSelectOption>
                      <NativeSelectOption value="json">
                        Arquivo ou lista JSON
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  {workspace.mode === "manual" ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="import-text">
                          Teor integral
                        </FieldLabel>
                        <Textarea
                          id="import-text"
                          rows={8}
                          {...workspace.form.register("text")}
                          aria-invalid={!!workspace.form.formState.errors.text}
                        />
                        <FieldError
                          errors={[workspace.form.formState.errors.text]}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="import-origin">
                          Origem dos dados
                        </FieldLabel>
                        <NativeSelect
                          id="import-origin"
                          {...workspace.form.register("origin")}
                          aria-invalid={
                            !!workspace.form.formState.errors.origin
                          }
                        >
                          <NativeSelectOption value="">
                            Selecione
                          </NativeSelectOption>
                          <NativeSelectOption value="real">
                            Caso real
                          </NativeSelectOption>
                          <NativeSelectOption value="synthetic">
                            Caso sintético
                          </NativeSelectOption>
                        </NativeSelect>
                        <FieldError
                          errors={[workspace.form.formState.errors.origin]}
                        />
                      </Field>
                      <div className="grid gap-5 sm:grid-cols-2">
                        {manualImportFields.map((field) => (
                          <Field key={field.name}>
                            <FieldLabel htmlFor={`import-${field.name}`}>
                              {field.label}
                            </FieldLabel>
                            <Input
                              id={`import-${field.name}`}
                              placeholder={field.placeholder}
                              {...workspace.form.register(field.name)}
                              aria-invalid={
                                !!workspace.form.formState.errors[field.name]
                              }
                            />
                            <FieldError
                              errors={[
                                workspace.form.formState.errors[field.name],
                              ]}
                            />
                          </Field>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <Field>
                        <FieldLabel htmlFor="import-file">
                          Arquivo JSON UTF-8 · até 2 MiB e 100 itens
                        </FieldLabel>
                        <Input
                          id="import-file"
                          type="file"
                          accept=".json,application/json"
                          onChange={workspace.chooseFile}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="import-json">
                          Lista de itens
                        </FieldLabel>
                        <Textarea
                          id="import-json"
                          rows={12}
                          spellCheck={false}
                          {...workspace.form.register("structured_text")}
                          aria-invalid={
                            !!workspace.form.formState.errors.structured_text
                          }
                        />
                        <FieldError
                          errors={[
                            workspace.form.formState.errors.structured_text,
                          ]}
                        />
                      </Field>
                      <details>
                        <summary className="cursor-pointer text-sm font-medium">
                          Ver formato e exemplo sintético
                        </summary>
                        <pre className="bg-muted mt-3 overflow-auto rounded-lg p-4 text-xs">
                          {importFileExample}
                        </pre>
                      </details>
                    </>
                  )}
                </FieldGroup>
              </fieldset>
              {workspace.form.formState.errors.root?.serverError ? (
                <p role="alert" className="text-destructive text-sm">
                  {workspace.form.formState.errors.root.serverError.message}
                </p>
              ) : null}
              <p className="text-muted-foreground text-sm">
                Até 128 KiB por texto. A prévia separa erros e duplicatas.
                Confirmar um lote encaminha apenas os itens selecionados para
                revisão de privacidade.
              </p>
              <Button type="submit" disabled={workspace.pending}>
                {workspace.pending
                  ? "Preparando prévia…"
                  : "Criar prévia privada"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lotes recentes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {workspace.list.isPending ? (
              <p role="status">Carregando lotes…</p>
            ) : null}
            {workspace.list.isError ? (
              <>
                <p role="alert">Não foi possível carregar os lotes.</p>
                <Button variant="outline" onClick={workspace.list.refresh}>
                  Tentar novamente
                </Button>
              </>
            ) : null}
            {workspace.list.isSuccess && !workspace.list.batches.length ? (
              <p className="text-muted-foreground text-sm">
                Nenhum lote importado.
              </p>
            ) : null}
            {workspace.list.batches.map((batch) => (
              <Link
                key={batch.id}
                href={`/backoffice/imports/${batch.id}`}
                className="hover:bg-muted focus-visible:ring-ring flex flex-col gap-2 rounded-lg border p-3 focus-visible:ring-2"
              >
                <span className="font-medium">{batch.name}</span>
                <span className="text-muted-foreground text-sm">
                  {batch.item_count} itens
                </span>
                <Badge variant="outline">{importStateLabel(batch.state)}</Badge>
              </Link>
            ))}
            {workspace.list.hasNextPage ? (
              <Button
                variant="outline"
                disabled={workspace.list.isFetchingNextPage}
                onClick={workspace.list.loadMore}
              >
                Carregar mais lotes
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
