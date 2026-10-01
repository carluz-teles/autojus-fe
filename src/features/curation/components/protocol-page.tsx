"use client";

import { Button, buttonVariants } from "@/components/ui/button";

import { useProtocolPage } from "../hooks/use-preparation";
import type { AnnotationProtocol } from "../services/annotation-preparation";
import { ProtocolForm } from "./protocol-form";

export function ProtocolDetails({
  protocol,
}: {
  protocol: AnnotationProtocol;
}) {
  return (
    <section
      className="space-y-4 rounded-lg border p-5"
      aria-label="Protocolo congelado"
    >
      <h2 className="font-display text-2xl">
        {protocol.key} · revisão {protocol.revision}
      </h2>
      <p>
        {protocol.origin === "synthetic" ? "Sintético" : "Real"} · matéria{" "}
        {protocol.matter_key}
      </p>
      <p className="whitespace-pre-wrap">{protocol.definition.rubric}</p>
      <p className="text-sm">
        {protocol.definition.review_policy.ordinary_reviews} revisões
        ordinárias; duas para conflitos/alertas, sujeitas à independência.
      </p>
      <details>
        <summary className="cursor-pointer font-medium">
          Catálogo e regras congelados
        </summary>
        <ul className="mt-3 ml-5 list-disc text-sm">
          {protocol.definition.contract.act_types.map((key) => (
            <li key={key}>
              {protocol.definition.act_type_labels?.[key] ?? key}
            </li>
          ))}
        </ul>
        {Object.entries(protocol.definition.contract.legal_rules).map(
          ([key, rule]) => (
            <div
              key={key}
              className="mt-4 space-y-2 rounded-md border p-3 text-sm"
            >
              <p className="font-medium">
                {protocol.definition.rule_sources[key]?.citation}
              </p>
              <p>
                {rule.quantity} {rule.unit} · {rule.anchor_event} ·{" "}
                {rule.start_rule}
              </p>
              <p className="break-all">
                Fonte: {protocol.definition.rule_sources[key]?.source_reference}
              </p>
              <p>{protocol.definition.rule_sources[key]?.review_note}</p>
            </div>
          ),
        )}
      </details>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Revisão registrada</dt>
          <dd className="break-all">
            {protocol.definition.review_reference} ·{" "}
            {protocol.definition.reviewed_at}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Motivo</dt>
          <dd>{protocol.definition.reason}</dd>
        </div>
      </dl>
      {protocol.previous_revision_id ? (
        <a
          href={`/backoffice/preparation/protocols/${protocol.previous_revision_id}`}
          className="text-sm underline"
        >
          Consultar revisão anterior
        </a>
      ) : null}
    </section>
  );
}
export function ProtocolEditorPage({ previousID }: { previousID?: string }) {
  const state = useProtocolPage(previousID);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui gestão de protocolos.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <a href="/backoffice/preparation" className="text-sm underline">
        Voltar à preparação
      </a>
      <h1 className="font-display text-3xl">
        {previousID
          ? "Nova revisão de protocolo"
          : "Criar protocolo de revisão"}
      </h1>
      <p className="text-muted-foreground">
        A revisão será imutável. Os registros de revisão precisam ser informados
        novamente ao criar uma versão.
      </p>
      {state.catalog.isError || (previousID && state.previous.isError) ? (
        <div role="alert">
          <p>Não foi possível carregar os dados de preparação.</p>
          <Button onClick={state.refresh}>
            Tentar carregar protocolo e catálogo
          </Button>
        </div>
      ) : state.catalog.data && (!previousID || state.previous.data) ? (
        <ProtocolForm
          key={previousID ?? "new"}
          previous={state.previous.data ?? null}
          catalog={state.catalog.data}
          author={state.author}
        />
      ) : (
        <p role="status">Carregando catálogo e protocolo…</p>
      )}
    </div>
  );
}
export function ProtocolDetailPage({ id }: { id: string }) {
  const state = useProtocolPage(id);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui protocolos.</p>;
  return (
    <div className="max-w-5xl space-y-6">
      <a href="/backoffice/preparation" className="text-sm underline">
        Voltar à preparação
      </a>
      <h1 className="font-display text-3xl">Protocolo de revisão</h1>
      {state.previous.isError ? (
        <div role="alert">
          <p>{state.previous.error.message}</p>
          <Button onClick={state.refresh}>Atualizar protocolo</Button>
        </div>
      ) : state.previous.data ? (
        <>
          <ProtocolDetails protocol={state.previous.data} />
          <a
            href={`/backoffice/preparation/protocols/new?previous=${id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Preparar nova revisão deste protocolo
          </a>
        </>
      ) : (
        <p role="status">Carregando protocolo…</p>
      )}
    </div>
  );
}
