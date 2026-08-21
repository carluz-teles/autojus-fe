"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import type {
  PrazoAnchorEvent,
  PrazoConfirmInput,
  PrazoCounting,
  PrazoDetalheView,
  PrazoView,
} from "../types";
import { useConfirmarPrazo } from "./use-confirmar-prazo";
import { usePreviewPrazo } from "./use-preview-prazo";

// ── Zod: fonte da validação client-side ──

const schema = z.object({
  kind: z.string().trim().min(1, "Informe o tipo do prazo."),
  days: z
    .number({ message: "Informe os dias do prazo." })
    .int("Use um número inteiro de dias.")
    .positive("O prazo deve ter ao menos 1 dia."),
  counting: z.enum(["BUSINESS", "CALENDAR"]),
  doubled: z.boolean(),
  doubled_reason: z.string().optional(),
  anchor_event: z.enum(["MADE_AVAILABLE", "PUBLISHED", "DEADLINE_START"]),
  manual_extra_days: z.number().int().min(0),
  has_holidays: z.boolean(),
});

export type ConfirmarPrazoValues = z.infer<typeof schema>;

// Tipos de prazo conhecidos (rótulos pt-BR). O detalhe pode trazer um kind fora
// desta lista — kindOptions() injeta o valor atual para não perdê-lo no select.
// Vocabulário de kinds em pt-BR — ALINHADO ao BE (deadline_rule usa CONTESTACAO/
// MANIFESTACAO/GENERICO; os demais são escolhas manuais usuais). O confirm envia o
// value como está; por isso precisa casar com o que o BE deriva/espera.
const PRAZO_KINDS: { value: string; label: string }[] = [
  { value: "CONTESTACAO", label: "Contestação" },
  { value: "MANIFESTACAO", label: "Manifestação" },
  { value: "RECURSO", label: "Recurso" },
  { value: "CONTRARRAZOES", label: "Contrarrazões" },
  { value: "EMBARGOS", label: "Embargos" },
  { value: "AGRAVO", label: "Agravo" },
  { value: "CUMPRIMENTO", label: "Cumprimento de sentença" },
  { value: "PAGAMENTO", label: "Pagamento" },
  { value: "GENERICO", label: "Genérico" },
];

// Motivos usuais de prazo em dobro no CPC (o detalhe pode trazer outro).
const DOUBLED_REASONS: string[] = [
  "Litisconsortes com procuradores distintos (art. 229, CPC)",
  "Fazenda Pública (art. 183, CPC)",
  "Ministério Público (art. 180, CPC)",
  "Defensoria Pública (art. 186, CPC)",
];

// Âncoras de prazo disponíveis.
export const ANCHOR_OPTIONS: {
  value: PrazoAnchorEvent;
  label: string;
}[] = [
  { value: "MADE_AVAILABLE", label: "Disponibilização" },
  { value: "PUBLISHED", label: "Publicação" },
  { value: "DEADLINE_START", label: "Termo derivado" },
];

// Regimes de contagem.
export const COUNTING_OPTIONS: { value: PrazoCounting; label: string }[] = [
  { value: "BUSINESS", label: "Dias úteis" },
  { value: "CALENDAR", label: "Corridos" },
];

// Monta o corpo do BE a partir dos valores do form.
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
      anchor_event: values.anchor_event,
      manual_extra_days:
        values.has_holidays && values.manual_extra_days > 0
          ? values.manual_extra_days
          : undefined,
    },
    // F2 só confirma/ajusta o prazo — as tarefas sugeridas viraram fluxo próprio.
    tasks: [],
  };
}

/** Extrai o anchor_event do prazo — fallback para MADE_AVAILABLE. */
function defaultAnchor(
  prazo: PrazoView | PrazoDetalheView | null,
): PrazoAnchorEvent {
  if (prazo && "anchor_event" in prazo && prazo.anchor_event) {
    return prazo.anchor_event;
  }
  return "MADE_AVAILABLE";
}

/**
 * Hook público do form de ajuste de prazo. Compõe RHF+Zod (pré-preenchido pelo
 * detalhe), a mutation useConfirmarPrazo e o usePreviewPrazo (recalc ao vivo com
 * debounce de ~300ms via React state separado).
 *
 * O debounce é implementado via useEffect+setTimeout nos valores assistidos —
 * sem dependência nova. Os valores debounced são passados ao usePreviewPrazo
 * que usa React Query para cache + dedup de chamadas idênticas.
 */
export function useConfirmarPrazoForm({
  intimationId,
  prazo,
}: {
  intimationId: string;
  prazo: PrazoView | PrazoDetalheView;
}) {
  const { confirmar, isPending, error } = useConfirmarPrazo();

  const form = useForm<ConfirmarPrazoValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: prazo.kind,
      days: (prazo as PrazoDetalheView).days ?? 15,
      counting: prazo.counting ?? "BUSINESS",
      doubled: prazo.doubled ?? false,
      doubled_reason: prazo.doubled_reason ?? "",
      anchor_event: defaultAnchor(prazo),
      manual_extra_days: prazo.manual_extra_days ?? 0,
      has_holidays: (prazo.manual_extra_days ?? 0) > 0,
    },
  });

  // useWatch — assinatura por campo, compatível com React Compiler.
  const doubled = useWatch({ control: form.control, name: "doubled" });
  const kind = useWatch({ control: form.control, name: "kind" });
  const doubledReason = useWatch({
    control: form.control,
    name: "doubled_reason",
  });
  const counting = useWatch({ control: form.control, name: "counting" });
  const anchorEvent = useWatch({ control: form.control, name: "anchor_event" });
  const days = useWatch({ control: form.control, name: "days" });
  const hasHolidays = useWatch({ control: form.control, name: "has_holidays" });
  const manualExtraDays = useWatch({
    control: form.control,
    name: "manual_extra_days",
  });

  // ── Debounce dos parâmetros de preview (~300ms) ──
  const [debouncedPreview, setDebouncedPreview] = useState({
    days,
    anchorEvent,
    counting,
    doubled,
    manualExtraDays: hasHolidays ? manualExtraDays : 0,
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedPreview({
        days,
        anchorEvent,
        counting,
        doubled,
        manualExtraDays: hasHolidays ? manualExtraDays : 0,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [days, anchorEvent, counting, doubled, hasHolidays, manualExtraDays]);

  const { preview, isPending: previewPending } = usePreviewPrazo({
    intimationId,
    anchorEvent: debouncedPreview.anchorEvent,
    kind,
    days: debouncedPreview.days,
    counting: debouncedPreview.counting,
    doubled: debouncedPreview.doubled,
    manualExtraDays: debouncedPreview.manualExtraDays,
    enabled: true,
  });

  const setDoubled = (value: boolean) => {
    form.setValue("doubled", value, { shouldDirty: true });
    if (!value) form.clearErrors("doubled_reason");
  };

  const setHasHolidays = (value: boolean) => {
    form.setValue("has_holidays", value, { shouldDirty: true });
    if (!value) form.setValue("manual_extra_days", 0, { shouldDirty: true });
  };

  const setAnchorEvent = (value: PrazoAnchorEvent) => {
    form.setValue("anchor_event", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const setCounting = (value: PrazoCounting) => {
    form.setValue("counting", value, { shouldDirty: true });
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
    setValue: form.setValue,
    errors: form.formState.errors,
    submit,
    // campos controlled
    doubled,
    setDoubled,
    kind,
    counting,
    setCounting,
    anchorEvent,
    setAnchorEvent,
    hasHolidays,
    setHasHolidays,
    manualExtraDays,
    doubledReason: doubledReason ?? "",
    // options
    kindOptions,
    doubledReasonOptions,
    // preview ao vivo
    preview,
    previewPending,
    // mutation
    isPending,
    error,
  };
}
