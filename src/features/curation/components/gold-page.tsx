"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  useGoldForm,
  useGoldPreview,
  useGoldRevision,
  useWithdrawalForm,
} from "../hooks/use-gold";
import {
  goldBlockerLabel,
  type GoldPreview,
  type GoldRevision,
  purposeLabel,
} from "../services/annotation-gold";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";

export function GoldBlockers({ blockers }: { blockers: string[] }) {
  return blockers.length ? (
    <ul
      className="list-disc space-y-1 pl-5 text-sm"
      aria-label="Bloqueios atuais"
    >
      {blockers.map((code) => (
        <li key={code}>{goldBlockerLabel(code)}</li>
      ))}
    </ul>
  ) : null;
}
export function GoldPreviewPage({ id }: { id: string }) {
  const state = useGoldPreview(id),
    data = state.query.data;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui publicação de gold.</p>;
  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/gold" className="text-sm underline">
          Voltar às decisões para publicação
        </a>
        <h1 className="font-display text-3xl">Conferir promoção para gold</h1>
      </header>
      <Button
        variant="outline"
        onClick={state.refresh}
        disabled={state.query.isFetching}
      >
        Atualizar elegibilidade
      </Button>
      {state.query.isPending ? <p role="status">Conferindo decisão…</p> : null}
      {state.query.isError ? (
        <p role="alert">
          Não foi possível atualizar a elegibilidade. Atualize antes de
          promover.
        </p>
      ) : null}
      {data ? (
        <>
          <section className="space-y-3 rounded-lg border p-5">
            <p>
              {data.origin === "synthetic" ? "Caso sintético" : "Caso real"} ·{" "}
              {data.split} · {data.quality}
            </p>
            <p>Data jurídica do caso: {data.legal_date}</p>
            <p>
              {data.eligible
                ? "Decisão elegível para promoção neste momento."
                : "Promoção bloqueada."}
            </p>
            <GoldBlockers blockers={data.blockers} />
            {data.previous_revision_id ? (
              <a
                className="text-sm underline"
                href={`/backoffice/gold/revisions/${data.previous_revision_id}`}
              >
                Consultar gold anterior · revisão {data.revision}
              </a>
            ) : null}
            {state.canDecide ? (
              <p>
                <a
                  className="text-sm underline"
                  href={`/backoffice/decisions/history/${data.decision_id}`}
                >
                  Abrir evidências jurídicas e registrar exposição às respostas
                </a>
              </p>
            ) : null}
          </section>
          <GoldPromotionForm
            preview={data}
            loading={state.query.isFetching || state.query.isError}
          />
        </>
      ) : null}
    </div>
  );
}
export function GoldPromotionForm({
  preview,
  loading,
}: {
  preview: GoldPreview;
  loading: boolean;
}) {
  const state = useGoldForm(preview, loading),
    { register } = state.form;
  if (state.write.mutation.data)
    return (
      <section className="space-y-3 rounded-lg border p-5" role="status">
        <h2 className="font-display text-2xl">
          Gold registrado · revisão {state.write.mutation.data.revision}
        </h2>
        <p>A promoção não executa treinamento nem indexação.</p>
        <a
          className={buttonVariants()}
          href={`/backoffice/gold/revisions/${state.write.mutation.data.id}`}
        >
          Consultar revisão e elegibilidade atual
        </a>
      </section>
    );
  return (
    <form onSubmit={state.submit} onChange={state.change} className="space-y-5">
      <fieldset disabled={state.locked} className="space-y-5">
        <legend className="font-display mb-4 text-2xl">
          Autorizar esta revisão
        </legend>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-medium">Finalidades autorizadas</legend>
          {preview.purposes.map((p) => (
            <label key={p} className="flex items-center gap-2">
              <input type="checkbox" value={p} {...register("purposes")} />
              {purposeLabel(p)}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="gold-from">
              Vigência jurídica — início
            </FieldLabel>
            <Input
              id="gold-from"
              type="date"
              {...register("legal_valid_from")}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="gold-until">
              Vigência jurídica — fim (opcional)
            </FieldLabel>
            <Input
              id="gold-until"
              type="date"
              {...register("legal_valid_until")}
            />
          </Field>
        </div>
        <p className="text-muted-foreground text-sm">
          O intervalo deve conter a data jurídica do caso. Finalidade RAG não
          autoriza indexação de controles reservados.
        </p>
        <Field>
          <FieldLabel htmlFor="gold-reason">Motivo da promoção</FieldLabel>
          <Textarea id="gold-reason" {...register("reason")} />
        </Field>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            {...register("confirmed")}
            onChange={state.confirm}
          />
          <span>
            Conferi a decisão, as finalidades e a vigência desta revisão.
          </span>
        </label>
        <Button type="submit" disabled={loading || !preview.eligible}>
          Registrar gold
        </Button>
      </fieldset>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <div className="space-y-2">
          <p>
            O envio ficou sem confirmação. Recupere o mesmo pedido antes de
            continuar.
          </p>
          <Button
            type="button"
            onClick={state.recover}
            disabled={state.write.mutation.isPending}
          >
            Recuperar promoção
          </Button>
        </div>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </form>
  );
}
export function GoldRevisionPage({ id }: { id: string }) {
  const state = useGoldRevision(id),
    r = state.query.data;
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui consulta de gold.</p>;
  return (
    <div className="max-w-4xl space-y-6">
      <header className="space-y-2">
        <a href="/backoffice/gold" className="text-sm underline">
          Voltar às decisões para publicação
        </a>
        <h1 className="font-display text-3xl">Revisão gold</h1>
      </header>
      <Button
        variant="outline"
        onClick={state.refresh}
        disabled={state.query.isFetching}
      >
        Atualizar elegibilidade
      </Button>
      {state.query.isPending ? <p role="status">Carregando revisão…</p> : null}
      {state.query.isError ? (
        <p role="alert">Não foi possível atualizar a revisão.</p>
      ) : null}
      {r ? (
        <>
          <section className="space-y-3 rounded-lg border p-5">
            <h2 className="font-display text-2xl">
              Revisão {r.revision} ·{" "}
              {r.origin === "synthetic" ? "Sintético" : "Real"}
            </h2>
            <p>
              {r.eligible && !state.query.isError
                ? "Elegível na última consulta"
                : "Confira os bloqueios atuais"}{" "}
              · {r.quality} · {r.split}
            </p>
            <GoldBlockers blockers={r.blockers} />
            <p>
              Vigência: {r.legal_valid_from} até{" "}
              {r.legal_valid_until ?? "sem fim informado"}
            </p>
            <p>Finalidades: {r.purposes.map(purposeLabel).join(", ")}</p>
            <p className="whitespace-pre-wrap">{r.reason}</p>
            <p className="text-muted-foreground text-xs break-all">
              SHA256: {r.content_digest}
            </p>
            <a
              href={`/backoffice/gold/decisions/${r.decision_id}`}
              className="text-sm underline"
            >
              Conferir decisão de origem
            </a>
            <p>
              <a
                className="text-sm underline"
                href={`/backoffice/withdrawals/sources/${r.source_link_id}`}
              >
                Conferir retirada da origem e do grupo relacionado
              </a>
            </p>
            {r.previous_revision_id ? (
              <p>
                <a
                  className="text-sm underline"
                  href={`/backoffice/gold/revisions/${r.previous_revision_id}`}
                >
                  Consultar revisão anterior
                </a>
              </p>
            ) : null}
          </section>
          <GoldWithdrawalForm revision={r} />
        </>
      ) : null}
    </div>
  );
}
export function GoldWithdrawalForm({ revision }: { revision: GoldRevision }) {
  const state = useWithdrawalForm(revision),
    { register } = state.form;
  if (state.write.mutation.data)
    return (
      <p role="status">
        Retirada registrada. Novos usos são bloqueados; cópias já entregues não
        são recolhidas. Recibo: {state.write.mutation.data.id}
      </p>
    );
  if (revision.blockers.includes("gold_withdrawn"))
    return <p>Esta revisão já foi retirada.</p>;
  return (
    <form
      onSubmit={state.submit}
      onChange={state.change}
      className="space-y-4 rounded-lg border p-5"
    >
      <fieldset disabled={state.locked} className="space-y-4">
        <legend className="font-display mb-3 text-2xl">
          Retirar esta revisão
        </legend>
        <p>
          Retirada permanente. Uma nova decisão jurídica será necessária para
          promover novamente este gabarito. Os datasets dependentes deixam de
          estar disponíveis para novos usos.
        </p>
        <Field>
          <FieldLabel htmlFor="withdraw-reason">Motivo da retirada</FieldLabel>
          <Textarea id="withdraw-reason" {...register("reason")} />
        </Field>
        <label className="flex items-start gap-2">
          <input type="checkbox" {...register("confirmed")} />
          <span>Confirmo a retirada permanente desta revisão.</span>
        </label>
        <Button type="submit" variant="destructive">
          Retirar gold
        </Button>
      </fieldset>
      {state.message ? <p role="alert">{state.message}</p> : null}
      {state.write.uncertain ? (
        <Button
          type="button"
          onClick={state.recover}
          disabled={state.write.mutation.isPending}
        >
          Recuperar retirada
        </Button>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </form>
  );
}
