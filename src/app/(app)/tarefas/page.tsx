"use client";

import {
  AlarmClock,
  CheckCircle2,
  CircleCheck,
  ListChecks,
  PlayCircle,
} from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  StatusBadge,
  type StatusTone,
  tarefaTone,
} from "@/components/ui/status-badge";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { useTaskActions } from "@/features/tasks/hooks/use-task-actions";
import { useTasksAgenda } from "@/features/tasks/hooks/use-tasks-agenda";
import { useTasksSummary } from "@/features/tasks/hooks/use-tasks-summary";
import { taskStatusLabel } from "@/features/tasks/lib/labels";
import type { TaskView } from "@/features/tasks/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// Agenda global de tarefas (task) — o "o que fazer" do tenant. KpiRow via GET
// /v1/tasks/summary; DataTable via GET /v1/tasks (read model), paginada por cursor,
// filtrada por status e pelo toggle "Todas/Minhas". O status de tela vem DERIVADO
// do BE (display_status); nada de cálculo no JSX.

const statusTone = (t: TaskView): StatusTone => tarefaTone(taskStatusLabel(t));

export default function TarefasPage() {
  const { summary } = useTasksSummary();
  const { nameFor } = useOrgMembersDirectory();
  const { markDone } = useTaskActions();
  const {
    tasks,
    totalCount,
    isPending,
    isFetching,
    error,
    meId,
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

  const fmt = (n?: number) => (n == null ? "—" : n);
  const rangeFrom = tasks.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const rangeTo = (pageNumber - 1) * pageSize + tasks.length;

  // Colunas: derivação delegada a helpers (lib/format, lib/labels, diretório de
  // membros). RESPONSÁVEL resolve o nome pelo assignee_user_id; PRIORIDADE não vem
  // no read de lista → "—".
  const columns: DataTableColumn<TaskView>[] = [
    {
      key: "tarefa",
      header: "Tarefa",
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-medium">{t.title}</span>
          {t.description ? (
            <span className="text-muted-foreground line-clamp-1 text-xs">
              {t.description}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "prazo",
      header: "Prazo",
      cell: (t) => (
        <span className="text-muted-foreground tabular-nums">
          {formatDate(t.due_date)}
        </span>
      ),
    },
    {
      key: "responsavel",
      header: "Responsável",
      cell: (t) => (
        <span className="text-muted-foreground">
          {nameFor(t.assignee_user_id) ?? "—"}
        </span>
      ),
    },
    {
      key: "prioridade",
      header: "Prioridade",
      cell: () => <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (t) => {
        const label = taskStatusLabel(t);
        return <StatusBadge label={label} tone={tarefaTone(label)} />;
      },
    },
  ];

  const rowActions = (t: TaskView) => [
    { label: "Ver", href: `/tarefas/${t.id}` },
    {
      label: "Concluir",
      icon: CheckCircle2,
      onSelect: () => markDone.mutate(t.id),
      disabled: t.status !== "OPEN" || markDone.isPending,
    },
  ];

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="O que fazer — tarefas derivadas dos prazos e intimações, atribuídas à equipe."
      />

      <section className="reveal mt-8">
        <KpiRow cols={4}>
          <KpiCard
            icon={ListChecks}
            label="Abertas"
            value={fmt(summary?.abertas)}
            tone="info"
          />
          <KpiCard
            icon={PlayCircle}
            label="Em execução"
            value={fmt(summary?.em_execucao)}
            tone="warning"
          />
          <KpiCard
            icon={CircleCheck}
            label="Concluídas"
            value={fmt(summary?.concluidas)}
            tone="success"
          />
          <KpiCard
            icon={AlarmClock}
            label="Atrasadas"
            value={fmt(summary?.atrasadas)}
            tone="danger"
          />
        </KpiRow>
      </section>

      <div className="reveal mt-6 flex flex-wrap items-center justify-end gap-2">
        <div className="bg-muted/60 inline-flex rounded-lg p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMine(false)}
            aria-pressed={!mine}
            className={cn(
              "h-7 rounded-md",
              !mine && "bg-card text-foreground shadow-sm",
            )}
          >
            Todas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMine(true)}
            disabled={!meId}
            aria-pressed={mine}
            className={cn(
              "h-7 rounded-md",
              mine && "bg-card text-foreground shadow-sm",
            )}
          >
            Minhas
          </Button>
        </div>
      </div>

      <div className="reveal mt-4">
        <DataTable
          columns={columns}
          rows={tasks}
          rowKey={(t) => t.id}
          statusTone={statusTone}
          rowActions={rowActions}
          isLoading={isPending || (isFetching && tasks.length === 0)}
          loadingLabel="Carregando tarefas…"
          error={error ? "Erro ao carregar as tarefas." : undefined}
          empty={
            <p className="text-muted-foreground px-5 py-10 text-center">
              {mine
                ? "Nenhuma tarefa atribuída a você — nada pendente por aqui."
                : "Nenhuma tarefa — elas nascem dos prazos e das intimações capturadas."}
            </p>
          }
          rangeFrom={error ? undefined : rangeFrom}
          rangeTo={error ? undefined : rangeTo}
          total={error ? undefined : totalCount}
          pagination={
            !isPending && !error ? (
              <ListPagination
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={onPrev}
                onNext={onNext}
              />
            ) : undefined
          }
        />
      </div>
    </>
  );
}
