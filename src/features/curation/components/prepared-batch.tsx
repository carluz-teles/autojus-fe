"use client";

import { Button, buttonVariants } from "@/components/ui/button";

import { useLocalPrediction, usePreparedBatch } from "../hooks/use-preparation";
import type { PreparedTask } from "../services/annotation-preparation";
import { splitLabels } from "../services/sampling";
import { AnnotationNavigationDialog } from "./annotation-navigation-dialog";
import { InferenceAction } from "./inference-action";
import { ProtocolDetails } from "./protocol-page";

export function LocalPredictionAction({
  task,
  digest,
  valid,
}: {
  task: PreparedTask;
  digest: string;
  valid: boolean;
}) {
  const state = useLocalPrediction(task, digest, valid);
  if (task.mode === "blind")
    return (
      <p className="text-muted-foreground text-sm">
        Controle cego: sem preparação de sugestão.
      </p>
    );
  if (!state.allowed)
    return (
      <p className="text-muted-foreground text-sm">
        A preparação da sugestão exige permissão específica.
      </p>
    );
  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        onClick={state.generate}
        disabled={!state.canGenerate}
      >
        Preparar sugestão local
      </Button>
      <p className="text-muted-foreground text-sm">
        Executa somente as regras locais, sem chamada de IA. O recibo não mostra
        a sugestão.
      </p>
      {state.write.mutation.data ? (
        <p role="status">
          Tentativa {state.write.mutation.data.attempt}:{" "}
          {state.write.mutation.data.state === "completed"
            ? "preparação concluída"
            : "preparação falhou"}
          . Nenhuma chamada externa.
        </p>
      ) : null}
      {state.write.mutation.error ? (
        <p role="alert">{state.write.mutation.error.message}</p>
      ) : null}
      {state.write.uncertain ? (
        <Button
          variant="outline"
          onClick={state.recover}
          disabled={state.write.mutation.isPending}
        >
          Recuperar preparação enviada
        </Button>
      ) : null}
      <AnnotationNavigationDialog navigation={state.navigation} />
    </div>
  );
}

export function PreparedBatchPage({ id }: { id: string }) {
  const state = usePreparedBatch(id);
  if (!state.allowed)
    return <p role="alert">Seu acesso não inclui gestão de lotes.</p>;
  return (
    <div className="space-y-6">
      <a href="/backoffice/preparation" className="text-sm underline">
        Voltar à preparação
      </a>
      <h1 className="font-display text-3xl">Lote de revisão</h1>
      <Button variant="outline" onClick={state.refresh}>
        Atualizar lote
      </Button>
      {state.batch.isError ? (
        <p role="alert">{state.batch.error.message}</p>
      ) : state.batch.data ? (
        <>
          <p>
            {state.batch.data.task_count} tarefas ·{" "}
            {state.batch.data.valid
              ? "Amostra válida"
              : "Amostra invalidada; novas revisões estão bloqueadas"}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`/backoffice/sampling/${state.batch.data.frame_id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Consultar amostra de origem
            </a>
            {state.canAnnotate && state.batch.data.valid ? (
              <a
                href={`/backoffice/curation?batch=${id}`}
                className={buttonVariants()}
              >
                Abrir fila de revisão deste lote
              </a>
            ) : null}
          </div>
          {state.protocol.data ? (
            <ProtocolDetails protocol={state.protocol.data} />
          ) : state.protocol.isError ? (
            <p role="alert">Não foi possível carregar o protocolo.</p>
          ) : (
            <p>Carregando protocolo…</p>
          )}
          <div className="divide-y rounded-lg border">
            {state.batch.data.tasks.map((task, index) => (
              <div key={task.id} className="space-y-3 p-4">
                <h2 className="font-medium">
                  Caso {index + 1} · {task.id.slice(0, 8)}
                </h2>
                <p className="text-sm">
                  {splitLabels[task.split]} ·{" "}
                  {task.mode === "blind" ? "Revisão cega" : "Revisão assistida"}
                </p>
                <LocalPredictionAction
                  task={task}
                  digest={state.protocol.data?.digest ?? ""}
                  valid={
                    state.batch.data?.valid === true && !state.batch.isError
                  }
                />
                <InferenceAction
                  task={task}
                  digest={state.protocol.data?.digest ?? ""}
                  valid={
                    state.batch.data?.valid === true && !state.batch.isError
                  }
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p role="status">Carregando lote…</p>
      )}
    </div>
  );
}
