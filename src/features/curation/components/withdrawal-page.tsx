"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

import {
  useScopedWithdrawalForm,
  useWithdrawalPage,
} from "../hooks/use-withdrawals";
import type {
  WithdrawalImpact,
  WithdrawalScope,
} from "../services/withdrawals";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
export function WithdrawalPage({
  scope,
  target,
}: {
  scope: WithdrawalScope;
  target: string;
}) {
  const state = useWithdrawalPage(scope, target),
    impact = state.query.data;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui esta retirada.</p>;
  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/withdrawals" className="text-sm underline">
          Voltar às origens e políticas
        </a>
        <h1 className="font-display text-3xl">
          {scope === "source" ? "Retirada de origem" : "Retirada de política"}
        </h1>
        <p className="break-all">{target}</p>
      </header>
      <Button
        variant="outline"
        onClick={state.refresh}
        disabled={state.query.isFetching}
      >
        Atualizar impacto
      </Button>
      {state.query.isPending ? (
        <p role="status">Conferindo dependências…</p>
      ) : null}
      {state.query.isError ? (
        <p role="alert">
          Não foi possível conferir o impacto. Atualize antes de retirar.
        </p>
      ) : null}
      {impact ? (
        <>
          <section className="space-y-4 rounded-lg border p-5">
            <h2 className="font-display text-2xl">Referências existentes</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt>Origens afetadas</dt>
                <dd className="text-2xl">{impact.affected_sources}</dd>
              </div>
              <div>
                <dt>Revisões gold</dt>
                <dd className="text-2xl">{impact.gold_revisions}</dd>
              </div>
              <div>
                <dt>Datasets</dt>
                <dd className="text-2xl">{impact.releases}</dd>
              </div>
              <div>
                <dt>Publicações de arquivos</dt>
                <dd className="text-2xl">{impact.publications}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-sm">
              Contagens incluem referências históricas e itens já bloqueados.
              Novas dependências e relações descobertas depois também estarão
              sujeitas à retirada.
            </p>
            {scope === "source" ? (
              <p>
                A retirada alcança a origem e seu grupo relacionado. Nenhum
                texto de gabarito é aberto nesta conferência.
              </p>
            ) : (
              <p>
                O bloqueio vale para intimações admitidas sob esta revisão neste
                workspace. A configuração global da política permanece{" "}
                {impact.policy_active ? "ativa" : "inativa"}.
              </p>
            )}
            {impact.group_withdrawn && !impact.already_withdrawn ? (
              <p>
                O grupo já está bloqueado por outra origem retirada. Você ainda
                pode registrar a retirada desta origem.
              </p>
            ) : null}
          </section>
          {impact.withdrawal ? (
            <section className="space-y-2 rounded-lg border p-5" role="status">
              <h2 className="font-medium">Retirada já registrada</h2>
              <p>{impact.withdrawal.reason}</p>
              <p className="text-sm break-all">
                Recibo {impact.withdrawal.id} · {impact.withdrawal.recorded_at}
              </p>
            </section>
          ) : null}
          <ScopedWithdrawalForm
            impact={impact}
            loading={state.query.isFetching || state.query.isError}
          />
        </>
      ) : null}
    </div>
  );
}
export function ScopedWithdrawalForm({
  impact,
  loading,
}: {
  impact: WithdrawalImpact;
  loading: boolean;
}) {
  const state = useScopedWithdrawalForm(impact, loading),
    { register } = state.form;
  if (state.write.mutation.data)
    return (
      <p role="status">
        Retirada registrada. Novos usos estão bloqueados; a limpeza dos arquivos
        ocorre pelo processamento interno. Recibo:{" "}
        {state.write.mutation.data.id}
      </p>
    );
  if (
    impact.already_withdrawn &&
    !state.write.uncertain &&
    !state.write.mutation.isPending
  )
    return null;
  return (
    <form onSubmit={state.submit} onChange={state.change} className="space-y-4">
      <fieldset disabled={state.locked} className="space-y-4">
        <legend className="font-display mb-3 text-2xl">
          Confirmar retirada permanente
        </legend>
        <p>
          Esta ação bloqueia novos usos dos gabaritos e datasets afetados. Ela
          não recolhe cópias já entregues.
        </p>
        <Field>
          <FieldLabel htmlFor="scoped-withdraw-reason">
            Motivo da retirada
          </FieldLabel>
          <Textarea id="scoped-withdraw-reason" {...register("reason")} />
        </Field>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            {...register("confirmed")}
            onChange={state.confirm}
          />
          <span>
            Conferi o impacto e confirmo a retirada permanente deste alvo.
          </span>
        </label>
        <Button type="submit" variant="destructive" disabled={loading}>
          Registrar retirada
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
            Recuperar retirada do alvo
          </Button>
        </div>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </form>
  );
}
