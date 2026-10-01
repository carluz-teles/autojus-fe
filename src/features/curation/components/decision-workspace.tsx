"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { useDecisionWorkspace } from "../hooks/use-decisions";
import { splitLabels } from "../services/sampling";

export function DecisionWorkspace() {
  const state = useDecisionWorkspace();
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui decisão jurídica.</p>;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/backoffice"
          className="text-muted-foreground text-sm underline"
        >
          Voltar à bancada
        </Link>
        <h1 className="font-display text-3xl">Decidir revisões</h1>
        <p className="text-muted-foreground">
          Casos com respostas submetidas. Abrir uma comparação registra acesso
          às respostas e impede novas revisões cegas daquele grupo.
        </p>
      </header>
      <div className="flex flex-wrap items-end gap-4">
        <Field className="max-w-sm">
          <FieldLabel htmlFor="decision-filter">Situação</FieldLabel>
          <NativeSelect id="decision-filter" {...state.form.register("state")}>
            <NativeSelectOption value="undecided">
              Sem decisão registrada
            </NativeSelectOption>
            <NativeSelectOption value="decided">
              Com decisão registrada
            </NativeSelectOption>
            <NativeSelectOption value="all">Todas</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Button variant="outline" onClick={state.refresh}>
          Atualizar fila de decisões
        </Button>
      </div>
      <p className="text-muted-foreground text-sm">
        Ter uma decisão registrada não significa estar publicado. A habilitação
        dos revisores e as condições atuais são verificadas ao comparar e
        decidir.
      </p>
      {state.query.isError ? (
        <p role="alert">
          Não foi possível carregar a fila. {state.query.error.message}
        </p>
      ) : state.query.isPending ? (
        <p role="status">Carregando decisões…</p>
      ) : !state.items.length ? (
        <p>Nenhum caso neste filtro.</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {state.items.map((item) => (
            <article
              key={item.task_id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="space-y-2">
                <h2 className="font-medium">Caso {item.task_id.slice(0, 8)}</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{splitLabels[item.split]}</Badge>
                  <Badge variant="secondary">
                    {item.mode === "blind"
                      ? "Controle cego"
                      : "Revisão assistida"}
                  </Badge>
                </div>
                <p className="text-sm">
                  {item.submitted_reviews} respostas · {item.critical_alerts}{" "}
                  alertas críticos
                </p>
                {!item.frame_valid ? (
                  <p className="text-sm">
                    Amostra invalidada; somente histórico disponível.
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.frame_valid ? (
                  <a
                    href={`/backoffice/decisions/tasks/${item.task_id}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Abrir comparação
                  </a>
                ) : null}
                {item.latest_decision_id ? (
                  <a
                    href={`/backoffice/decisions/history/${item.latest_decision_id}`}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    Consultar decisão
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
      {state.query.hasNextPage ? (
        <Button
          variant="outline"
          onClick={state.more}
          disabled={state.query.isFetchingNextPage}
        >
          Carregar mais decisões
        </Button>
      ) : null}
    </div>
  );
}
