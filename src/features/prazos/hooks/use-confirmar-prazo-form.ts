"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type { PrazoConfirmInput, PrazoDetalheView } from "../types";
import { useConfirmarPrazo } from "./use-confirmar-prazo";

// ── Zod: fonte da validação client-side (days>0) ──

const schema = z.object({
  kind: z.string().trim().min(1, "Informe o tipo do prazo."),
  days: z
    .number({ message: "Informe os dias do prazo." })
    .int("Use um número inteiro de dias.")
    .positive("O prazo deve ter ao menos 1 dia."),
  counting: z.enum(["BUSINESS", "CALENDAR"]),
  doubled: z.boolean(),
  doubled_reason: z.string().optional(),
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
    // F2 só confirma/ajusta o prazo — as tarefas sugeridas viraram fluxo próprio na
    // Análise (POST /v1/tasks, uma a uma). O confirm faz REPLACE-ALL de tasks no BE:
    // mandar algo aqui apagaria as tasks já criadas na Análise. Por isso, sempre [].
    tasks: [],
  };
}

/**
 * Hook público do form F2. Compõe RHF+Zod (pré-preenchido pelo detalhe) e a mutation
 * useConfirmarPrazo, e expõe só handlers + estado para o componente (que fica em
 * JSX+binding). `doubled` é controle não-nativo, gerido por setValue/watch. As tarefas
 * saíram do F2 (viraram fluxo próprio na Análise); aqui só confirma/ajusta o prazo.
 */
export function useConfirmarPrazoForm({
  intimationId,
  detalhe,
}: {
  intimationId: string;
  detalhe: PrazoDetalheView;
}) {
  const { confirmar, isPending, error } = useConfirmarPrazo();

  const form = useForm<ConfirmarPrazoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: detalhe.kind,
      days: detalhe.days,
      // Regime de contagem fica no valor derivado (sem toggle no F2): sem endpoint de
      // recontagem, o vencimento segue o end_date do prazo. Vai no payload como veio.
      counting: detalhe.counting,
      doubled: detalhe.doubled,
      doubled_reason: detalhe.doubled_reason ?? "",
    },
  });

  // useWatch (não form.watch) — assinatura por campo compatível com o React
  // Compiler; reage a cada mudança sem re-render do form inteiro.
  const doubled = useWatch({ control: form.control, name: "doubled" });
  const kind = useWatch({ control: form.control, name: "kind" });
  const doubledReason = useWatch({
    control: form.control,
    name: "doubled_reason",
  });

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

  const submit = form.handleSubmit((values) =>
    confirmar(toConfirmInput(intimationId, values)),
  );

  return {
    register: form.register,
    errors: form.formState.errors,
    submit,
    // controle não-nativo (em dobro)
    doubled,
    setDoubled,
    // options dos selects
    kindOptions,
    doubledReasonOptions,
    // estado da mutation
    isPending,
    error,
  };
}
