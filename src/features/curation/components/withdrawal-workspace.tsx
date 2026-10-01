"use client";
import { Button } from "@/components/ui/button";

import { useWithdrawalWorkspace } from "../hooks/use-withdrawals";
export function WithdrawalWorkspace() {
  const state = useWithdrawalWorkspace();
  if (!state.allowed)
    return (
      <p role="alert">
        Seu acesso não inclui retirada de origens ou políticas.
      </p>
    );
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <a href="/backoffice" className="text-sm underline">
          Voltar à bancada
        </a>
        <h1 className="font-display text-3xl">
          Retirada de origens e políticas
        </h1>
        <p className="text-muted-foreground">
          Consulte o impacto nos gabaritos e datasets antes de bloquear novos
          usos.
        </p>
      </header>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar origens e políticas
      </Button>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">Origens admitidas</h2>
        {state.sources.isPending ? (
          <p role="status">Carregando origens…</p>
        ) : null}
        {state.sources.isError ? (
          <p role="alert">Não foi possível carregar as origens.</p>
        ) : null}
        {state.sources.isSuccess && !state.sourceItems.length ? (
          <p>Nenhuma origem admitida.</p>
        ) : null}
        <div className="divide-y rounded-lg border">
          {state.sourceItems.map((s) => (
            <article key={s.id} className="space-y-2 p-4">
              <p className="break-all">Origem {s.id}</p>
              <p>
                {s.origin === "synthetic" ? "Sintética" : "Real"} ·{" "}
                {s.matter_key} · data jurídica {s.legal_date}
              </p>
              {s.withdrawn ? <p>Retirada registrada nesta origem.</p> : null}
              <a
                className="text-sm underline"
                href={`/backoffice/withdrawals/sources/${s.id}`}
              >
                Conferir impacto da origem
              </a>
            </article>
          ))}
        </div>
        {state.sources.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreSources}
            disabled={state.sources.isFetching}
          >
            Carregar mais origens
          </Button>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl">
          Políticas usadas neste workspace
        </h2>
        {state.policies.isPending ? (
          <p role="status">Carregando políticas…</p>
        ) : null}
        {state.policies.isError ? (
          <p role="alert">Não foi possível carregar as políticas.</p>
        ) : null}
        {state.policies.isSuccess && !state.policyItems.length ? (
          <p>Nenhuma política vinculada a origens reais deste workspace.</p>
        ) : null}
        <div className="divide-y rounded-lg border">
          {state.policyItems.map((p) => (
            <article key={p.revision} className="space-y-2 p-4">
              <h3 className="font-medium">Política · revisão {p.revision}</h3>
              <p>
                {p.source_count} origens ·{" "}
                {p.active
                  ? "Configuração global ativa"
                  : "Configuração global inativa"}
              </p>
              {p.withdrawn ? <p>Retirada registrada neste workspace.</p> : null}
              <a
                className="text-sm underline"
                href={`/backoffice/withdrawals/policies/${p.revision}`}
              >
                Conferir impacto da política {p.revision}
              </a>
            </article>
          ))}
        </div>
        {state.policies.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.morePolicies}
            disabled={state.policies.isFetching}
          >
            Carregar mais políticas
          </Button>
        ) : null}
      </section>
    </div>
  );
}
