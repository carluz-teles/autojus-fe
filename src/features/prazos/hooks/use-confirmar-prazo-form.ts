"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useMe } from "@/features/onboarding/hooks/use-me";

import type {
  PrazoConfirmInput,
  PrazoCounting,
  PrazoDetalheView,
} from "../types";
import { useConfirmarPrazo } from "./use-confirmar-prazo";
import { useTarefasSugeridas } from "./use-tarefas-sugeridas";

// ── Zod: fonte da validação client-side (days>0, título não-vazio) ──

const taskSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à tarefa."),
  kind: z.string().optional(),
  due_date: z.string().optional(),
  assignee_user_id: z.string().optional(),
  description: z.string().optional(),
});

const schema = z.object({
  kind: z.string().trim().min(1, "Informe o tipo do prazo."),
  days: z
    .number({ message: "Informe os dias do prazo." })
    .int("Use um número inteiro de dias.")
    .positive("O prazo deve ter ao menos 1 dia."),
  counting: z.enum(["BUSINESS", "CALENDAR"]),
  doubled: z.boolean(),
  doubled_reason: z.string().optional(),
  tasks: z.array(taskSchema),
});

export type ConfirmarPrazoValues = z.infer<typeof schema>;

// Tipos de prazo conhecidos (rótulos pt-BR). O detalhe pode trazer um kind fora
// desta lista — kindOptions() injeta o valor atual para não perdê-lo no select.
const PRAZO_KINDS: { value: string; label: string }[] = [
  { value: "APPEAL", label: "Recurso" },
  { value: "APPEAL_REPLY", label: "Contrarrazões" },
  { value: "ANSWER", label: "Contestação" },
  { value: "DEFENSE", label: "Defesa" },
  { value: "EMBARGOS", label: "Embargos" },
  { value: "MANIFESTATION", label: "Manifestação" },
  { value: "COMPLIANCE", label: "Cumprimento" },
  { value: "PAYMENT", label: "Pagamento" },
  { value: "APPEAL_INNER", label: "Agravo interno" },
];

// Motivos usuais de prazo em dobro no CPC (o detalhe pode trazer outro).
const DOUBLED_REASONS: string[] = [
  "Litisconsortes com procuradores distintos (art. 229, CPC)",
  "Fazenda Pública (art. 183, CPC)",
  "Ministério Público (art. 180, CPC)",
  "Defensoria Pública (art. 186, CPC)",
];

const emptyTask = (): ConfirmarPrazoValues["tasks"][number] => ({
  title: "",
  kind: "",
  due_date: "",
  assignee_user_id: "",
  description: "",
});

// Monta o corpo do BE a partir dos valores do form: normaliza strings, omite os
// opcionais vazios e só manda doubled_reason quando "em dobro". (Fora do JSX.)
function toConfirmInput(
  intimationId: string,
  values: ConfirmarPrazoValues,
): PrazoConfirmInput {
  return {
    intimation_id: intimationId,
    deadline: {
      kind: values.kind.trim(),
      days: values.days,
      counting: values.counting,
      doubled: values.doubled,
      doubled_reason: values.doubled
        ? values.doubled_reason?.trim() || undefined
        : undefined,
    },
    tasks: values.tasks.map((t) => ({
      title: t.title.trim(),
      kind: t.kind?.trim() || undefined,
      due_date: t.due_date || undefined,
      description: t.description?.trim() || undefined,
      assignee_user_id: t.assignee_user_id || undefined,
    })),
  };
}

/**
 * Hook público do form F2. Compõe RHF+Zod (pré-preenchido pelo detalhe), o
 * useFieldArray das tarefas e a mutation useConfirmarPrazo, e expõe só handlers +
 * estado para o componente (que fica em JSX+binding). `counting`/`doubled` são
 * controles não-nativos, geridos por setValue/watch e devolvidos prontos.
 */
export function useConfirmarPrazoForm({
  intimationId,
  detalhe,
}: {
  intimationId: string;
  detalhe: PrazoDetalheView;
}) {
  const { data: me } = useMe();
  const { confirmar, isPending, error } = useConfirmarPrazo();

  const form = useForm<ConfirmarPrazoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: detalhe.kind,
      days: detalhe.days,
      counting: detalhe.counting,
      doubled: detalhe.doubled,
      doubled_reason: detalhe.doubled_reason ?? "",
      tasks: [emptyTask()],
    },
  });

  const tasks = useFieldArray({ control: form.control, name: "tasks" });

  // useWatch (não form.watch) — assinatura por campo compatível com o React
  // Compiler; reage a cada mudança sem re-render do form inteiro.
  const counting = useWatch({ control: form.control, name: "counting" });
  const doubled = useWatch({ control: form.control, name: "doubled" });
  const kind = useWatch({ control: form.control, name: "kind" });
  const doubledReason = useWatch({
    control: form.control,
    name: "doubled_reason",
  });

  const setCounting = (value: PrazoCounting) =>
    form.setValue("counting", value, { shouldDirty: true });

  const setDoubled = (value: boolean) => {
    form.setValue("doubled", value, { shouldDirty: true });
    if (!value) form.clearErrors("doubled_reason");
  };

  // Selects "completos": incluem o valor pré-preenchido mesmo se estiver fora das
  // listas conhecidas (evita um select mostrar vazio por causa do BE).
  const kindOptions = useMemo(() => {
    const known = PRAZO_KINDS.some((k) => k.value === kind);
    return known ? PRAZO_KINDS : [{ value: kind, label: kind }, ...PRAZO_KINDS];
  }, [kind]);

  const doubledReasonOptions = useMemo(() => {
    const current = doubledReason?.trim();
    return current && !DOUBLED_REASONS.includes(current)
      ? [current, ...DOUBLED_REASONS]
      : DOUBLED_REASONS;
  }, [doubledReason]);

  // "Atribuir a mim" usa o id INTERNO do usuário atual (Me.user_id). Só listamos
  // quem tem id interno conhecido no cliente — não inventamos assignees.
  const assigneeOptions = me?.user_id
    ? [{ value: me.user_id, label: "Atribuir a mim" }]
    : [];

  // Tarefas sugeridas por IA (on-demand): o form aparece na hora; as sugestões chegam em
  // ~1-2s e pré-preenchem a lista UMA vez — só se o advogado ainda não mexeu (não clobbera
  // edição manual). Se o LLM falhar, o form segue com a tarefa vazia. tasks.replace é método
  // do RHF (não setState), seguro no effect.
  const { data: sugeridas, isLoading: sugerindo } = useTarefasSugeridas(
    detalhe.id,
  );
  useEffect(() => {
    const items = sugeridas?.suggested_tasks;
    if (items?.length && !form.formState.isDirty) {
      tasks.replace(
        items.map((s) => ({ ...emptyTask(), title: s.title, kind: s.kind })),
      );
    }
    // Reage só à chegada das sugestões; form/tasks são refs estáveis do RHF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sugeridas]);

  const submit = form.handleSubmit((values) =>
    confirmar(toConfirmInput(intimationId, values)),
  );

  return {
    register: form.register,
    errors: form.formState.errors,
    submit,
    // tarefas (useFieldArray)
    taskFields: tasks.fields,
    addTask: () => tasks.append(emptyTask()),
    removeTask: (index: number) => tasks.remove(index),
    // IA sugerindo as tarefas (pré-preenchimento on-demand)
    sugerindo,
    // controles não-nativos
    counting,
    setCounting,
    doubled,
    setDoubled,
    // options dos selects
    kindOptions,
    doubledReasonOptions,
    assigneeOptions,
    // estado da mutation
    isPending,
    error,
  };
}
