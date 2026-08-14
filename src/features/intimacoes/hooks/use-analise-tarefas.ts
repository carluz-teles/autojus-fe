"use client";

import { useEffect, useRef, useState } from "react";

import { useMe } from "@/features/onboarding/hooks/use-me";
import type { SuggestedTask } from "@/features/prazos/types";
import { useCreateTask } from "@/features/tasks/hooks/use-create-task";
import { useUpdateTask } from "@/features/tasks/hooks/use-update-task";
import type { CreateTaskInput } from "@/features/tasks/types";
import { toDateInput } from "@/lib/format";

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
  // Erro de falha parcial do "Aprovar tudo" (mutation de lote): null quando o último
  // lote fechou inteiro ou ainda não rodou; texto quando N cards falharam no meio.
  const [batchError, setBatchError] = useState<string | null>(null);

  // Semeia os cards a partir das sugestões do LLM UMA vez por prazo (a resposta é
  // estável na sessão). Guard por ref CHAVEADO no deadlineId: trocar de prazo/intimação
  // reseta o seeding (o componente pode ser reutilizado com outro prazo no drawer);
  // dentro do MESMO prazo, o ref impede reescrever depois que o advogado editou/descartou.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (seededFor.current === context.deadlineId || tasks.length === 0) return;
    seededFor.current = context.deadlineId;
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
  }, [tasks, context.deadlineId, context.defaultDueDate]);

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

  // "Aprovar tudo" cria EM LOTE os cards ainda pendentes. Processa em sequência com
  // mutateAsync + Promise.allSettled: cada card vira created só quando o POST confirmou,
  // e uma falha no meio do lote NÃO mascara o resto (nem o contrário) — o erro é
  // reportado por card e, quando há falha parcial, exposto em `batchError` para o
  // componente avisar que o lote não fechou inteiro.
  const approveAll = () => {
    const pending = cards.filter(
      (c) => c.status === "pending" && c.title.trim(),
    );
    if (pending.length === 0) return;
    setBatchError(null);
    // SNAPSHOT das chaves: cards é fechamento do render atual; o allSettled abaixo
    // completa de forma assíncrona, então não confiamos em cards mutado no meio.
    const keys = pending.map((c) => c.key);
    void Promise.allSettled(
      keys.map(async (key) => {
        const card = cards.find((c) => c.key === key);
        if (!card) return;
        const task = await create.createTaskAsync(buildInput(card));
        patchCard(key, { status: "created", taskId: task.id, editing: false });
      }),
    ).then((results) => {
      const failed = results.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      ).length;
      if (failed > 0) {
        setBatchError(
          `${failed} de ${keys.length} tarefa(s) não puderam ser criada(s). ` +
            "Verifique os cards em aberto e tente novamente.",
        );
      }
    });
  };

  return {
    cards,
    hasCards: cards.length > 0,
    pendingCount: cards.filter((c) => c.status === "pending").length,
    busy: create.isPending || update.isPending,
    batchError,
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
