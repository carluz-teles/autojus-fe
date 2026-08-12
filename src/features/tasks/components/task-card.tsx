"use client";

import { Check, CircleAlert, User, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useTaskActions } from "../hooks/use-task-actions";
import type { TaskStatus, TaskView } from "../types";

// ── Rótulos e cálculos (fora do JSX: componente = binding; lógica em helpers) ──

// "kind" legível: mapa dos tipos conhecidos + humanização de fallback, para que
// qualquer valor do BE apareça apresentável.
const KIND_LABEL: Record<string, string> = {
  REVIEW_DEADLINE: "Revisar prazo",
  CONFIRM_DEADLINE: "Confirmar prazo",
  REVIEW_INTIMATION: "Revisar intimação",
  DRAFT_DOCUMENT: "Elaborar peça",
  FILE_DOCUMENT: "Protocolar peça",
  CONTACT_CLIENT: "Contatar cliente",
};

function humanize(raw: string): string {
  const spaced = raw.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function kindLabel(kind: string | undefined): string | null {
  if (!kind) return null;
  return KIND_LABEL[kind] ?? humanize(kind);
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: "Em aberto",
  DONE: "Concluída",
  DISMISSED: "Dispensada",
};

// Vencida = ainda em aberto e com vencimento no passado.
function isOverdue(task: TaskView): boolean {
  if (task.status !== "OPEN" || !task.due_date) return false;
  const due = new Date(task.due_date);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
}

// Responsável em rótulo curto: "Você" quando é o usuário atual, senão "Atribuída".
function assigneeLabel(task: TaskView, currentUserId?: string): string | null {
  if (!task.assignee_user_id) return null;
  return task.assignee_user_id === currentUserId ? "Você" : "Atribuída";
}

// Tom visual do cartão — reúne status e atraso numa única decisão de estilo.
type TaskTone = "overdue" | "open" | "done" | "dismissed";

function taskTone(task: TaskView): TaskTone {
  if (task.status === "DONE") return "done";
  if (task.status === "DISMISSED") return "dismissed";
  return isOverdue(task) ? "overdue" : "open";
}

const CARD_TONE: Record<TaskTone, string> = {
  overdue: "border-destructive/30 bg-destructive/[0.03]",
  open: "",
  done: "opacity-80",
  dismissed: "opacity-60",
};

// ── Badge de status ──

function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === "DONE") {
    return (
      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        {STATUS_LABEL.DONE}
      </Badge>
    );
  }
  const variant = status === "DISMISSED" ? "secondary" : "default";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

// ── Cartão de tarefa ──

/**
 * Cartão de uma tarefa: título, tipo legível, vencimento em pt-BR (com marca
 * "vencida" quando o prazo passou e ainda está em aberto), badge de status,
 * responsável e — só quando OPEN — as ações "Concluir"/"Dispensar". As ações
 * vêm de useTaskActions; os botões desabilitam enquanto qualquer mutação corre.
 */
export function TaskCard({
  task,
  currentUserId,
}: {
  task: TaskView;
  currentUserId?: string;
}) {
  const { markDone, dismiss } = useTaskActions();
  const tone = taskTone(task);
  const kind = kindLabel(task.kind);
  const assignee = assigneeLabel(task, currentUserId);
  const overdue = tone === "overdue";
  const busy = markDone.isPending || dismiss.isPending;

  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors",
        CARD_TONE[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kind ? (
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {kind}
            </span>
          ) : null}
          <h3 className="leading-snug font-medium">{task.title}</h3>
          {task.description ? (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
              {task.description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        {task.due_date ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 tabular-nums",
              overdue && "text-destructive font-medium",
            )}
          >
            {overdue ? <CircleAlert className="size-3.5" /> : null}
            {overdue ? "Vencida — " : "Vence em "}
            {formatDate(task.due_date)}
          </span>
        ) : (
          <span>Sem prazo</span>
        )}
        {assignee ? (
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5" />
            {assignee}
          </span>
        ) : null}
      </div>

      {task.status === "OPEN" ? (
        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dismiss.mutate(task.id)}
            disabled={busy}
          >
            <X /> Dispensar
          </Button>
          <Button
            size="sm"
            onClick={() => markDone.mutate(task.id)}
            disabled={busy}
          >
            <Check /> Concluir
          </Button>
        </div>
      ) : null}
    </article>
  );
}

// Skeleton de carregamento — mesma silhueta do cartão.
export function TaskCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="bg-muted h-3 w-20 animate-pulse rounded" />
          <div className="bg-muted h-4 w-40 animate-pulse rounded" />
        </div>
        <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
      </div>
      <div className="bg-muted h-3 w-28 animate-pulse rounded" />
    </div>
  );
}
