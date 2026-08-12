"use client";

import { ListChecks } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Checkbox } from "@/components/ui/checkbox";
import { ListPagination } from "@/components/ui/list-pagination";
import { Select } from "@/components/ui/select";
import {
  TaskCard,
  TaskCardSkeleton,
} from "@/features/tasks/components/task-card";
import {
  type TaskStatusFilter,
  useTasksAgenda,
} from "@/features/tasks/hooks/use-tasks-agenda";
import { ApiError } from "@/lib/api/errors";
import { formatCount } from "@/lib/format";

// Agenda de tarefas — o "o que fazer" do tenant (GET /v1/tasks, read model do BE),
// filtrada por status, com o toggle "meus prazos" (?assignee=<meuId>) e paginada
// por cursor (prev/próxima). Espelha a tela de Prazos.

const STATUS_OPTIONS: { value: TaskStatusFilter; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "OPEN", label: "Em aberto" },
  { value: "DONE", label: "Concluídas" },
  { value: "DISMISSED", label: "Dispensadas" },
];

export default function TarefasPage() {
  const {
    tasks,
    totalCount,
    total,
    isPending,
    isFetching,
    error,
    meId,
    status,
    setStatus,
    mine,
    setMine,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useTasksAgenda();

  const countLabel = isPending
    ? "Carregando…"
    : totalCount === total
      ? `${formatCount(total)} ${total === 1 ? "tarefa" : "tarefas"}`
      : `${formatCount(totalCount)} de ${formatCount(total)} tarefas`;

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="O que fazer — tarefas derivadas dos prazos e intimações, atribuídas à equipe."
      />

      <div className="reveal mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <ListChecks className="text-gold size-4" />
          <span className="font-medium tabular-nums">{countLabel}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm select-none">
            <Checkbox
              checked={mine}
              onCheckedChange={(checked) => setMine(checked === true)}
              disabled={!meId}
              aria-label="Mostrar só as minhas tarefas"
            />
            Meus prazos
          </label>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatusFilter)}
            aria-label="Filtrar por status"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="reveal mt-4" aria-busy={isFetching}>
        {isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-10 text-center text-sm">
            {error instanceof ApiError
              ? error.message
              : "Erro ao carregar as tarefas."}
          </p>
        ) : tasks.length === 0 ? (
          <div className="text-muted-foreground flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
            <ListChecks className="size-6 opacity-60" />
            <span className="max-w-sm">
              {mine
                ? "Nenhuma tarefa atribuída a você — nada pendente por aqui."
                : "Nenhuma tarefa — elas nascem dos prazos e das intimações capturadas."}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} currentUserId={meId ?? undefined} />
            ))}
          </div>
        )}
      </div>

      {!isPending && !error ? (
        <ListPagination
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageNumber={pageNumber}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          totalCount={totalCount}
        />
      ) : null}
    </>
  );
}
