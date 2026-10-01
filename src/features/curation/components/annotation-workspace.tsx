"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import { useAnnotationWorkspace } from "../hooks/use-annotations";
import { assignmentStateLabel } from "../services/annotation-assignments";
import { splitLabels } from "../services/sampling";

export function AnnotationWorkspace({ batch }: { batch?: string }) {
  const state = useAnnotationWorkspace(batch);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui revisão de intimações.</p>;
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/backoffice"
          className="text-muted-foreground text-sm underline"
        >
          Voltar à bancada
        </Link>
        <h1 className="font-display text-3xl">Revisar intimações</h1>
        <p className="text-muted-foreground">
          Escolha um lote e reserve um caso. Suas respostas ficam preservadas
          para revisão jurídica.
        </p>
      </header>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar fila e meu trabalho
      </Button>
      <section aria-label="Fila de revisão" className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="annotation-batch">Lote de revisão</FieldLabel>
            <NativeSelect
              id="annotation-batch"
              {...state.form.register("batch")}
              disabled={state.claimMutation.isPending || state.uncertain}
            >
              <NativeSelectOption value="">Escolha um lote</NativeSelectOption>
              {state.batch && !state.selectedBatch ? (
                <NativeSelectOption value={state.batch}>
                  Lote atual · {state.batch.slice(0, 8)}
                </NativeSelectOption>
              ) : null}
              {state.batchItems.map((item) => (
                <NativeSelectOption
                  key={item.id}
                  value={item.id}
                  disabled={!item.valid}
                >
                  {item.recorded_at.slice(0, 10)} · {item.task_count} casos ·{" "}
                  {item.id.slice(0, 8)}
                  {item.valid ? "" : " · Invalidado"}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="annotation-slot">
              Posição de revisão
            </FieldLabel>
            <NativeSelect
              id="annotation-slot"
              {...state.form.register("slot")}
              disabled={state.claimMutation.isPending || state.uncertain}
            >
              <NativeSelectOption value="0">
                Revisão primária
              </NativeSelectOption>
              <NativeSelectOption value="1">
                Controle independente 1
              </NativeSelectOption>
              <NativeSelectOption value="2">
                Controle independente 2
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="annotation-availability">
              Exibir nos itens carregados
            </FieldLabel>
            <NativeSelect
              id="annotation-availability"
              {...state.form.register("availability")}
            >
              <NativeSelectOption value="all">
                Todas as posições
              </NativeSelectOption>
              <NativeSelectOption value="available">
                Posições disponíveis
              </NativeSelectOption>
            </NativeSelect>
          </Field>
        </div>
        {state.batches.isError ? (
          <p role="alert">
            Não foi possível carregar os lotes. Atualize a fila para tentar
            novamente.
          </p>
        ) : state.batches.isPending ? (
          <p role="status">Carregando lotes…</p>
        ) : state.batchItems.length === 0 ? (
          <p>Ainda não há lotes preparados para revisão.</p>
        ) : null}
        {state.batches.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreBatches}
            disabled={state.batches.isFetchingNextPage}
          >
            Carregar mais lotes
          </Button>
        ) : null}
        {state.selectedBatch ? (
          <p className="text-muted-foreground text-sm">
            {state.selectedBatch.task_count} casos neste lote. A reserva
            verifica sua elegibilidade e a disponibilidade atual da posição.
          </p>
        ) : null}
        {state.claimMutation.error ? (
          <p role="alert">{state.claimMutation.error.message}</p>
        ) : null}
        {state.uncertain ? (
          <div role="alert" className="space-y-3 rounded-md border p-4">
            <p>
              O resultado da reserva não foi confirmado. Recupere o mesmo envio
              antes de escolher outro caso.
            </p>
            <Button
              onClick={state.recover}
              disabled={state.claimMutation.isPending}
            >
              Recuperar reserva enviada
            </Button>
          </div>
        ) : null}
        {!state.batch ? (
          <p>Selecione um lote para consultar as tarefas.</p>
        ) : state.queue.isError ? (
          <p role="alert">
            Não foi possível carregar as tarefas. Suas reservas anteriores
            permanecem no histórico.
          </p>
        ) : state.queue.isPending ? (
          <p role="status">Carregando tarefas…</p>
        ) : state.tasks.length === 0 ? (
          <p>Nenhuma posição corresponde ao filtro nos itens carregados.</p>
        ) : (
          <div className="divide-y rounded-lg border">
            {state.tasks.map((task, index) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="space-y-2">
                  <p className="font-medium">
                    Caso {index + 1} · {task.id.slice(0, 8)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{splitLabels[task.split]}</Badge>
                    <Badge variant="secondary">
                      {task.mode === "blind"
                        ? "Revisão cega"
                        : "Revisão assistida"}
                    </Badge>
                    <span className="text-muted-foreground text-sm">
                      {!task.slot_available
                        ? "Posição ocupada ou concluída"
                        : !task.prediction_ready
                          ? "Aguardando preparação da sugestão"
                          : "Disponível para reserva"}
                    </span>
                  </div>
                </div>
                <Button
                  onClick={state.claim}
                  data-task={task.id}
                  disabled={
                    !task.slot_available ||
                    !task.prediction_ready ||
                    state.claimMutation.isPending ||
                    state.uncertain
                  }
                >
                  Reservar e revisar
                </Button>
              </div>
            ))}
          </div>
        )}
        {state.queue.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreTasks}
            disabled={state.queue.isFetchingNextPage}
          >
            Carregar mais tarefas
          </Button>
        ) : null}
        {state.batch ? (
          <p className="text-muted-foreground text-sm">
            {state.loadedCount} tarefas carregadas.
          </p>
        ) : null}
      </section>
      <section className="space-y-4" aria-label="Meu trabalho">
        <h2 className="font-display text-2xl">Meu trabalho</h2>
        {state.own.isError ? (
          <p role="alert">Não foi possível carregar suas reservas.</p>
        ) : state.own.isPending ? (
          <p role="status">Carregando seu trabalho…</p>
        ) : state.ownItems.length === 0 ? (
          <p>Você ainda não reservou casos.</p>
        ) : (
          state.ownItems.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
                <div className="space-y-1">
                  <p className="font-medium">
                    {assignmentStateLabel(assignment.state)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Caso {assignment.task_id.slice(0, 8)} ·{" "}
                    {assignment.mode === "blind" ? "Cego" : "Assistido"}
                  </p>
                  {!assignment.valid ? (
                    <p>Amostra invalidada; trabalho preservado.</p>
                  ) : null}
                </div>
                {/* Keep the same document boundary as claim/recovery so browser Back honors unsaved work. */}
                <a
                  href={`/backoffice/curation/${assignment.id}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  {assignment.state === "active"
                    ? "Continuar revisão"
                    : "Consultar meu trabalho"}
                </a>
              </CardContent>
            </Card>
          ))
        )}
        {state.own.hasNextPage ? (
          <Button
            variant="outline"
            onClick={state.moreOwn}
            disabled={state.own.isFetchingNextPage}
          >
            Carregar mais reservas
          </Button>
        ) : null}
      </section>
    </div>
  );
}
