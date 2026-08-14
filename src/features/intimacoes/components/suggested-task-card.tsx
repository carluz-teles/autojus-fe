"use client";

import { CalendarClock, Check, Pencil, Plus, User, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { taskKindLabel } from "@/features/tasks/lib/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type {
  AnaliseTaskCard,
  AnaliseTaskDraft,
} from "../hooks/use-analise-tarefas";

/**
 * Card de UMA tarefa sugerida pela IA — apresentacional (JSX + binding). O estado
 * (rascunho, criado) e as mutations vivem em useAnaliseTarefas; aqui só exibe o card,
 * alterna para os inputs inline quando `editing` e dispara os callbacks. Botões:
 * "Criar tarefa" (primária), editar (lápis) e descartar (×). Depois de criado, "Salvar"
 * (PATCH) substitui "Criar tarefa" e o × some.
 */
export function SuggestedTaskCard({
  card,
  assigneeLabel,
  busy,
  onDraftChange,
  onToggleEdit,
  onDismiss,
  onCreate,
  onSave,
}: {
  card: AnaliseTaskCard;
  assigneeLabel: string | null;
  busy: boolean;
  onDraftChange: (draft: AnaliseTaskDraft) => void;
  onToggleEdit: (editing: boolean) => void;
  onDismiss: () => void;
  onCreate: () => void;
  onSave: () => void;
}) {
  const created = card.status === "created";
  const kind = card.kind.trim();
  const canSubmit = !busy && card.title.trim().length > 0;

  return (
    <article
      className={cn(
        "bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm transition-colors",
        created && "border-emerald-200/70 dark:border-emerald-900/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {kind ? (
            <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {taskKindLabel(kind)}
            </span>
          ) : null}
          {card.editing ? (
            <Input
              aria-label="Título da tarefa"
              value={card.title}
              onChange={(e) => onDraftChange({ title: e.target.value })}
              placeholder="Título da tarefa"
              className="mt-1"
            />
          ) : (
            <h4 className="leading-snug font-medium">{card.title}</h4>
          )}
        </div>
        {created ? (
          <Badge className="shrink-0 border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="size-3" /> Criada
          </Badge>
        ) : null}
      </div>

      {card.editing ? (
        <div className="flex flex-col gap-2">
          <Input
            type="date"
            aria-label="Vencimento da tarefa"
            value={card.dueDate}
            onChange={(e) => onDraftChange({ dueDate: e.target.value })}
          />
          <Input
            aria-label="Descrição da tarefa"
            value={card.description}
            onChange={(e) => onDraftChange({ description: e.target.value })}
            placeholder="Descrição (opcional)"
          />
        </div>
      ) : (
        <>
          {card.description ? (
            <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
              {card.description}
            </p>
          ) : null}
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <CalendarClock className="size-3.5" />
              {card.dueDate
                ? `Vence em ${formatDate(card.dueDate)}`
                : "Sem prazo"}
            </span>
            <span className="inline-flex items-center gap-1">
              <User className="size-3.5" />
              {assigneeLabel ?? "Sem responsável"}
            </span>
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-1.5 border-t pt-3">
        {card.editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleEdit(false)}
            >
              Fechar
            </Button>
            {created ? (
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                disabled={!canSubmit}
              >
                <Check /> Salvar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={onCreate}
                disabled={!canSubmit}
              >
                <Plus /> Criar tarefa
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Editar tarefa"
              onClick={() => onToggleEdit(true)}
            >
              <Pencil />
            </Button>
            {created ? null : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Descartar tarefa"
                  onClick={onDismiss}
                >
                  <X />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onCreate}
                  disabled={!canSubmit}
                >
                  <Plus /> Criar tarefa
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}

// Skeleton — mesma silhueta do card enquanto a IA analisa a intimação.
export function SuggestedTaskCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
        <div className="bg-muted h-4 w-48 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-3 w-full animate-pulse rounded" />
      <div className="bg-muted h-3 w-32 animate-pulse rounded" />
    </div>
  );
}
