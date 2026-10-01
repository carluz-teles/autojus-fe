"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useImportBatch } from "../hooks/use-import-batch";
import { importIssueLabel, importStateLabel } from "../services/imports";

export function ImportBatchPanel({ id }: { id: string }) {
  const workspace = useImportBatch(id);
  if (!workspace.allowed)
    return <p role="alert">Seu acesso não inclui importação de casos.</p>;
  if (workspace.query.isPending)
    return <p role="status">Carregando lote privado…</p>;
  if (workspace.query.isError || !workspace.query.data)
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert">
          Não foi possível abrir o lote. Confira seu acesso ou tente novamente.
        </p>
        <Button onClick={workspace.refresh} variant="outline">
          Tentar novamente
        </Button>
      </div>
    );
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link
        href="/backoffice/imports"
        className={buttonVariants({
          variant: "outline",
          className: "self-start",
        })}
      >
        Voltar aos lotes
      </Link>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-3xl">{workspace.query.data.name}</h1>
        <Badge variant="outline">
          {importStateLabel(workspace.query.data.state)}
        </Badge>
        <p className="text-muted-foreground">
          Confira o texto e a procedência de cada item. Erros devem ser
          corrigidos na origem e importados em novo lote.
        </p>
      </header>
      <dl className="flex flex-wrap gap-6 rounded-lg border p-4">
        {Object.entries(workspace.query.data.counts).map(([state, count]) => (
          <div key={state}>
            <dt className="text-muted-foreground text-sm">
              {importStateLabel(state)}
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
      {workspace.rows.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle>Item {item.row_number}</CardTitle>
            <Badge variant="outline">{importStateLabel(item.state)}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="max-h-80 overflow-auto rounded-lg border p-4 whitespace-pre-wrap">
              {item.input.text}
            </p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Origem</dt>
                <dd>
                  {item.input.origin === "synthetic"
                    ? "Sintética"
                    : item.input.origin === "real"
                      ? "Real"
                      : "Não declarada"}{" "}
                  · {item.input.source_reference}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Captura</dt>
                <dd>{item.input.captured_at}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Processo / tribunal</dt>
                <dd>
                  {item.input.group_key} · {item.input.context.court}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Procedimento / canal</dt>
                <dd>
                  {item.input.context.procedure} · {item.input.context.channel}
                </dd>
              </div>
            </dl>
            {item.errors.length ? (
              <ul className="text-destructive list-disc pl-5 text-sm">
                {item.errors.map((error) => (
                  <li key={error}>{importIssueLabel(error)}</li>
                ))}
              </ul>
            ) : null}
            {item.state === "duplicate_candidate" ? (
              <p className="text-sm">
                Mesmo texto e contexto já encontrados
                {item.duplicate_rows.length
                  ? ` nos itens ${item.duplicate_rows.join(", ")} deste lote`
                  : " em outro lote interno"}
                . Uma republicação pode ser mantida com justificativa.
              </p>
            ) : null}
            {workspace.active && item.state === "awaiting_privacy" ? (
              <Link
                href={`/backoffice/imports/${id}/review/${item.id}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "self-start",
                })}
              >
                Revisar privacidade do item {item.row_number}
              </Link>
            ) : null}
            {workspace.active && item.selectable ? (
              <>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Input
                    type="checkbox"
                    className="size-4"
                    value={item.id}
                    checked={item.selected}
                    disabled={workspace.busy}
                    onChange={workspace.toggle}
                  />
                  Selecionar item {item.row_number} para revisão de privacidade
                </label>
                {item.state === "duplicate_candidate" ? (
                  <Field>
                    <FieldLabel htmlFor={`duplicate-${item.id}`}>
                      Motivo para manter esta possível duplicata
                    </FieldLabel>
                    <Input
                      id={`duplicate-${item.id}`}
                      name={item.id}
                      value={item.duplicateReason}
                      onChange={workspace.changeReason}
                      disabled={workspace.busy}
                      maxLength={2000}
                    />
                  </Field>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {workspace.mutation.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{workspace.mutation.error.message}</p>
          <Button variant="outline" onClick={workspace.refresh}>
            Atualizar lote preservando seleção
          </Button>
        </div>
      ) : null}
      {workspace.mutation.isSuccess ? (
        <p role="status">
          Comando registrado. Estado do lote atualizado pelo servidor.
        </p>
      ) : null}
      {workspace.active ? (
        <>
          <Button
            disabled={!workspace.canConfirm || workspace.busy}
            onClick={workspace.confirm}
          >
            Confirmar seleção para revisão de privacidade
          </Button>
          <details className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">
              Cancelar o restante do lote
            </summary>
            <div className="mt-4 flex flex-col items-start gap-4">
              <p className="text-muted-foreground text-sm">
                Itens pendentes serão rejeitados. Itens já admitidos mantêm seus
                próprios controles de retirada.
              </p>
              <Field>
                <FieldLabel htmlFor="cancel-reason">
                  Motivo do cancelamento
                </FieldLabel>
                <Textarea
                  id="cancel-reason"
                  value={workspace.cancelReason}
                  onChange={workspace.changeCancelReason}
                  maxLength={2000}
                  disabled={workspace.busy}
                />
              </Field>
              <Button
                variant="destructive"
                disabled={!workspace.cancelReason.trim() || workspace.busy}
                onClick={workspace.cancel}
              >
                Cancelar itens pendentes
              </Button>
            </div>
          </details>
        </>
      ) : null}
    </div>
  );
}
