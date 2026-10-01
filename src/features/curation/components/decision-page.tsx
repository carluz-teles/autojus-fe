"use client";

import { Button } from "@/components/ui/button";

import { useDecisionPage } from "../hooks/use-decisions";
import { DecisionForm } from "./decision-form";

export function DecisionPage({ task }: { task: string }) {
  const state = useDecisionPage(task);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui decisão jurídica.</p>;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/decisions" className="text-sm underline">
          Voltar à fila de decisões
        </a>
        <h1 className="font-display text-3xl">Comparar e decidir</h1>
        <p className="text-muted-foreground">
          Caso {task.slice(0, 8)} · A abertura das respostas é registrada para
          preservar a independência das revisões.
        </p>
      </header>
      {state.query.isError ? (
        <div role="alert" className="space-y-3">
          <p>{state.query.error.message}</p>
          <Button
            variant="outline"
            onClick={state.refresh}
            disabled={state.query.isFetching}
          >
            Tentar atualizar comparação
          </Button>
        </div>
      ) : null}
      {state.query.data ? (
        <DecisionForm
          input={state.query.data}
          refreshing={state.query.isFetching || state.query.isError}
          refresh={state.refresh}
        />
      ) : state.query.isPending ? (
        <p role="status">Carregando comparação…</p>
      ) : null}
    </div>
  );
}
