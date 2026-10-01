"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

import {
  useAnnotationPage,
  useAnnotationResume,
} from "../hooks/use-annotations";
import {
  type AnnotationAssignmentDetail,
  assignmentStateLabel,
} from "../services/annotation-assignments";
import { AnnotationAnswerPreview } from "./annotation-answer";
import { AnnotationQuestionnaire } from "./annotation-questionnaire";

export function AnnotationPage({
  id,
  recoverFrom,
}: {
  id: string;
  recoverFrom?: string;
}) {
  const state = useAnnotationPage(id, recoverFrom);
  if (!state.allowed || state.denied)
    return (
      <p role="alert">
        Esta revisão não está disponível para sua sessão interna atual.
      </p>
    );
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <Link
          href={
            state.detail.data
              ? `/backoffice/curation?batch=${state.detail.data.batch_id}`
              : "/backoffice/curation"
          }
          className="text-muted-foreground text-sm underline"
          prefetch={false}
        >
          Voltar à fila de intimações
        </Link>
        <h1 className="font-display text-3xl">
          {state.detail.data
            ? assignmentStateLabel(state.detail.data.assignment.state)
            : "Revisão de intimação"}
        </h1>
      </header>
      <Button variant="outline" onClick={state.refresh}>
        Conferir reserva e rascunho no servidor
      </Button>
      {state.detail.isPending ? (
        <p role="status">Consultando sua reserva…</p>
      ) : null}
      {state.detail.error ? (
        <p role="alert">{state.detail.error.message}</p>
      ) : null}
      {state.detail.data && !state.detail.data.assignment.valid ? (
        <p role="alert">
          A amostra foi invalidada. Seu trabalho anterior está preservado; não é
          possível continuar a anotação neste lote.
        </p>
      ) : null}
      {state.previous.loading ? (
        <p role="status">Recuperando seu rascunho anterior…</p>
      ) : null}
      {state.previous.error || state.previous.mismatched ? (
        <p role="alert">
          Não foi possível recuperar um rascunho autorizado da mesma tarefa.
          Nenhum campo foi substituído.
        </p>
      ) : null}
      {state.input.error ? (
        <p role="alert">{state.input.error.message}</p>
      ) : null}
      {state.currentInput ? (
        <AnnotationQuestionnaire
          key={id}
          input={state.currentInput}
          writable={state.writable}
          previousDraft={state.previous.draft}
        />
      ) : state.writable ? (
        <p role="status">Carregando o texto e o questionário…</p>
      ) : null}
      {state.detail.data?.assignment.state === "submitted" ? (
        <section
          className="space-y-4 rounded-lg border p-5"
          aria-label="Resposta submetida"
        >
          <h2 className="font-display text-xl">Sua resposta foi registrada</h2>
          <p>
            A submissão fica disponível para a revisão jurídica. Ela não é
            promovida automaticamente a gold.
          </p>
          {state.submission.data ? (
            <AnnotationAnswerPreview
              annotation={state.submission.data.annotation}
            />
          ) : state.submission.isError ? (
            <p role="alert">Não foi possível consultar o conteúdo submetido.</p>
          ) : (
            <p role="status">Carregando resposta…</p>
          )}
          <Link
            href={`/backoffice/curation?batch=${state.detail.data.batch_id}`}
            className={buttonVariants()}
            prefetch={false}
          >
            Escolher próximo caso do lote
          </Link>
        </section>
      ) : null}
      {!state.currentInput && state.recovery.data ? (
        <section
          className="space-y-4 rounded-lg border p-5"
          aria-label="Meu rascunho preservado"
        >
          <h2 className="font-display text-xl">Meu rascunho preservado</h2>
          {state.recovery.data.annotation === null ? (
            <p>Nenhum rascunho foi salvo nesta reserva.</p>
          ) : (
            <AnnotationAnswerPreview
              annotation={state.recovery.data.annotation}
            />
          )}
        </section>
      ) : null}
      {!state.currentInput &&
      state.detail.data &&
      state.detail.data.assignment.valid &&
      (state.detail.data.assignment.state === "expired" ||
        state.detail.data.assignment.state === "released") ? (
        <AnnotationResume detail={state.detail.data} />
      ) : null}
    </div>
  );
}
function AnnotationResume({ detail }: { detail: AnnotationAssignmentDetail }) {
  const state = useAnnotationResume(detail);
  return (
    <section className="space-y-3">
      <p>
        Uma nova reserva permite retomar o caso se a posição estiver disponível.
        Você poderá conferir e copiar seu rascunho anterior.
      </p>
      {state.mutation.error ? (
        <p role="alert">{state.mutation.error.message}</p>
      ) : null}
      <Button onClick={state.resume} disabled={state.mutation.isPending}>
        {state.uncertain
          ? "Recuperar a reserva enviada"
          : "Retomar em nova reserva"}
      </Button>
    </section>
  );
}
