"use client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";

import { useGoldWorkspace } from "../hooks/use-gold";
import { decisionOutcomeLabels } from "../services/annotation-decisions";
export function GoldWorkspace() {
  const state = useGoldWorkspace();
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui publicação de gold.</p>;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <a href="/backoffice" className="text-sm underline">
          Voltar à bancada
        </a>
        <h1 className="font-display text-3xl">Publicação de gold</h1>
        <p className="text-muted-foreground">
          Confira as decisões humanas, autorize as finalidades e registre a
          vigência jurídica de cada gabarito.
        </p>
      </header>
      <Button
        variant="outline"
        onClick={state.refresh}
        disabled={state.query.isFetching}
      >
        Atualizar decisões
      </Button>
      {state.query.isError ? (
        <p role="alert">
          Não foi possível atualizar as decisões. Tente novamente.
        </p>
      ) : null}
      {state.query.isPending ? <p role="status">Carregando decisões…</p> : null}
      {state.query.isSuccess && !state.items.length ? (
        <p>Nenhuma decisão registrada neste workspace.</p>
      ) : null}
      <div className="divide-y rounded-lg border">
        {state.items.map((item) => (
          <article key={item.task_id} className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {item.origin === "synthetic" ? "Sintético" : "Real"}
              </Badge>
              <Badge variant="secondary">{item.split}</Badge>
              <span>Decisão · revisão {item.decision_revision}</span>
            </div>
            <p>
              {decisionOutcomeLabels[item.outcome]} · {item.quality}
            </p>
            <p className="text-muted-foreground text-sm break-all">
              Tarefa {item.task_id}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className={buttonVariants({ variant: "outline" })}
                href={`/backoffice/gold/decisions/${item.decision_id}`}
              >
                Conferir promoção
              </a>
              {item.latest_gold_id ? (
                <a
                  className="self-center text-sm underline"
                  href={`/backoffice/gold/revisions/${item.latest_gold_id}`}
                >
                  Consultar última revisão gold
                </a>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {state.query.hasNextPage ? (
        <Button
          variant="outline"
          onClick={state.more}
          disabled={state.query.isFetching}
        >
          Carregar mais decisões
        </Button>
      ) : null}
    </div>
  );
}
