"use client";

import { ListChecks } from "lucide-react";

import { ApiError } from "@/lib/api/errors";

import { useTasksDoProcesso } from "../hooks/use-tasks-do-processo";
import { TaskCard, TaskCardSkeleton } from "./task-card";

// Bloco "Tarefas" do processo (renderizado na aba Prazos, abaixo dos prazos):
// as tarefas nascem dos prazos/intimações, então vivem no mesmo contexto. Só
// JSX + binding — leitura e estado vivem no hook. Espelha ProcessoPrazos.
export function ProcessoTasks({ processoId }: { processoId: string }) {
  const { tasks, isPending, isError, error } = useTasksDoProcesso(processoId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <TaskCardSkeleton />
        <TaskCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
        {error instanceof ApiError
          ? error.message
          : "Erro ao carregar as tarefas."}
      </p>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-32 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
        <ListChecks className="size-5 opacity-60" />
        <span className="max-w-xs">Nenhuma tarefa para este processo.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}
    </div>
  );
}
