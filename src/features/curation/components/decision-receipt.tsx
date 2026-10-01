"use client";

import { Button, buttonVariants } from "@/components/ui/button";

import { useDecisionReceipt } from "../hooks/use-decisions";
import {
  type AnnotationDecision,
  decisionOutcomeLabels,
} from "../services/annotation-decisions";
import { AnnotationAnswerPreview } from "./annotation-answer";

export function DecisionReceipt({ receipt }: { receipt: AnnotationDecision }) {
  return (
    <section
      className="space-y-4 rounded-lg border p-5"
      aria-label="Decisão registrada"
    >
      <h2 className="font-display text-2xl">
        Decisão registrada · revisão {receipt.revision}
      </h2>
      <p>{decisionOutcomeLabels[receipt.outcome]}</p>
      <p className="whitespace-pre-wrap">{receipt.reason}</p>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Origem</dt>
          <dd>
            {receipt.origin === "synthetic" ? "Caso sintético" : "Caso real"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Estado da revisão</dt>
          <dd>
            {receipt.current
              ? "Última decisão registrada"
              : "Substituída por outra decisão"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            Respostas e habilitações dos revisores
          </dt>
          <dd>
            {receipt.inputs_current
              ? "Correspondem à decisão"
              : "Mudaram após a decisão"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Amostra</dt>
          <dd>
            {receipt.frame_valid ? "Válida nesta consulta" : "Invalidada"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Habilitação do decisor</dt>
          <dd>
            {receipt.authority_current
              ? "Ativa nesta consulta"
              : "Mudou após a decisão"}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-sm">
        Este registro preserva a decisão e suas evidências. A publicação do
        conjunto exige uma etapa própria de elegibilidade.
      </p>
      {receipt.annotation ? (
        <AnnotationAnswerPreview annotation={receipt.annotation} />
      ) : (
        <p>Exemplo rejeitado, sem resposta aprovada.</p>
      )}
      <details>
        <summary className="cursor-pointer font-medium">
          Respostas consideradas nesta decisão
        </summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {receipt.evidence.reviews.map((review, index) => (
            <article
              key={review.submission_id}
              className="space-y-2 rounded-md border p-4"
            >
              <h3>
                Revisão {index + 1} ·{" "}
                {review.mode === "blind" ? "Cega" : "Assistida"}
              </h3>
              <AnnotationAnswerPreview annotation={review.annotation} />
            </article>
          ))}
        </div>
      </details>
      {receipt.evidence.alerts.map((alert) => (
        <p key={alert.id} className="whitespace-pre-wrap">
          Alerta considerado: {alert.reason}
        </p>
      ))}
      <div className="flex flex-wrap gap-3">
        {receipt.previous_decision_id ? (
          <a
            href={`/backoffice/decisions/history/${receipt.previous_decision_id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Ver decisão anterior
          </a>
        ) : null}
        {receipt.frame_valid ? (
          <a
            href={`/backoffice/decisions/tasks/${receipt.task_id}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Comparar novamente para nova decisão
          </a>
        ) : null}
      </div>
    </section>
  );
}
export function DecisionHistoryPage({ id }: { id: string }) {
  const state = useDecisionReceipt(id);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui decisões.</p>;
  return (
    <div className="space-y-6">
      <a href="/backoffice/decisions" className="text-sm underline">
        Voltar à fila de decisões
      </a>
      <h1 className="font-display text-3xl">Histórico jurídico</h1>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar condições da decisão
      </Button>
      {state.query.isError ? (
        <p role="alert">{state.query.error.message}</p>
      ) : state.query.data ? (
        <DecisionReceipt receipt={state.query.data} />
      ) : (
        <p role="status">Carregando histórico…</p>
      )}
    </div>
  );
}
