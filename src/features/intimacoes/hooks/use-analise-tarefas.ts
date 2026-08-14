"use client";

import { useEffect, useRef, useState } from "react";

import { useMe } from "@/features/onboarding/hooks/use-me";
import type { SuggestedTask } from "@/features/prazos/types";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import { useUpdateTask } from "@/features/tasks/hooks/use-update-task";
import type { CreateTaskInput } from "@/features/tasks/types";

// Contexto que liga cada tarefa sugerida ao prazo/intimação de origem — vira os FKs
// do POST /v1/tasks. `defaultDueDate` é o end_date do prazo (RFC3339) que pré-preenche
// o vencimento de cada card.
export interface AnaliseTaskContext {
  deadlineId: string;
  intimationId: string;
  courtRecordId?: string;
  defaultDueDate?: string | null;
}

type CardStatus = "pending" | "created";

// Estado local (client-side) de UM card: o rascunho editável + se já virou task no BE.
// Nunca sai daqui sem passar por useCreateTask/useUpdateTask.
export interface AnaliseTaskCard {
  key: string;
  title: string;
  description: string;
  kind: string;
  /** Vencimento no formato "YYYY-MM-DD" (date input). */
  dueDate: string;
  status: CardStatus;
  taskId: string | null;
  editing: boolean;
}

export interface AnaliseTaskDraft {
  title?: string;
  description?: string;
  dueDate?: string;
}

// "2026-08-20T00:00:00Z" → "2026-08-20" (valor do <input type="date">).
function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return match ? match[1] : "";
}

/**
 * Hook público da seção de análise: dono do estado dos cards de tarefas sugeridas
 * (semeado UMA vez quando o LLM responde) e das mutations de criar/editar. O card e a
 * seção ficam em JSX + binding — toda a lógica (rascunho, criar, aprovar tudo) vive aqui.
 * "Aprovar tudo" cria em lote só os cards ainda pendentes; editar após criado dispara PATCH.
 */
export function useAnaliseTarefas({
  tasks,
  context,
}: {
  tasks: SuggestedTask[];
  context: AnaliseTaskContext;
}) {
  const { data: me } = useMe();
  const create = useCreateTask();
  const update = useUpdateTask();

  const [cards, setCards] = useState<AnaliseTaskCard[]>([]);

  // Semeia os cards a partir das sugestões do LLM UMA vez (a resposta é estável na
  // sessão). Guard por ref para não reescrever depois que o advogado editou/descartou.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || tasks.length === 0) return;
    seeded.current = true;
    setCards(
      tasks.map((task, index) => ({
        key: `sug-${index}`,
        title: task.title,
        description: task.description,
        kind: task.kind,
        dueDate: toDateInput(context.defaultDueDate),
        status: "pending" as const,
        taskId: null,
        editing: false,
      })),
    );
  }, [tasks, context.defaultDueDate]);

  const patchCard = (key: string, patch: Partial<AnaliseTaskCard>) =>
    setCards((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const buildInput = (card: AnaliseTaskCard): CreateTaskInput => ({
    title: card.title.trim(),
    description: card.description.trim() || undefined,
    kind: card.kind.trim() || undefined,
    due_date: card.dueDate || undefined,
    assignee_user_id: me?.user_id || undefined,
    deadline_id: context.deadlineId,
    intimation_id: context.intimationId,
    court_record_id: context.courtRecordId,
  });

  const createOne = (key: string) => {
    const card = cards.find((c) => c.key === key);
    if (!card || card.status !== "pending" || !card.title.trim()) return;
    create.createTask(buildInput(card), {
      onSuccess: (task) =>
        patchCard(key, { status: "created", taskId: task.id, editing: false }),
    });
  };

  const saveOne = (key: string) => {
    const card = cards.find((c) => c.key === key);
    if (!card?.taskId || !card.title.trim()) return;
    update.updateTask(
      {
        id: card.taskId,
        patch: {
          title: card.title.trim(),
          description: card.description.trim(),
          kind: card.kind.trim() || undefined,
          due_date: card.dueDate,
        },
      },
      { onSuccess: () => patchCard(key, { editing: false }) },
    );
  };

  const approveAll = () => {
    cards.forEach((card) => {
      if (card.status === "pending" && card.title.trim()) createOne(card.key);
    });
  };

  return {
    cards,
    hasCards: cards.length > 0,
    pendingCount: cards.filter((c) => c.status === "pending").length,
    busy: create.isPending || update.isPending,
    // "Você" quando há id interno; sem endpoint de membros, é o único assignee possível.
    assigneeLabel: me?.user_id ? "Você" : null,
    updateDraft: (key: string, draft: AnaliseTaskDraft) =>
      patchCard(key, draft),
    setEditing: (key: string, editing: boolean) => patchCard(key, { editing }),
    dismiss: (key: string) => setCards((cs) => cs.filter((c) => c.key !== key)),
    createOne,
    saveOne,
    approveAll,
  };
}
