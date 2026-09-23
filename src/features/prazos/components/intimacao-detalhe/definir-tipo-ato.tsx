"use client";

// Control "Definir tipo do ato" — DISCRETO e SEMPRE disponível: o usuário escolhe,
// ele mesmo, o tipo do ato (e o prazo) da intimação. É o que limpa a pré-condição
// ACT_TYPE_NOT_DEFINED do BE. Usado (a) inline no pre-flight da peça (Check 1) e
// (b) como control autônomo no detalhe. Dropdown = shadcn Select (nunca <select>
// nativo). Só JSX + binding; a lógica vive em useDefinirTipo.

import { Check, LoaderCircle } from "lucide-react";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIPO_ATO_LABEL } from "@/features/intimacoes/lib/tipo-ato";
import { useDefinirTipo } from "@/features/prazos/hooks/use-definir-tipo";
import { formatarData } from "@/lib/utils";

import type { PrazoDetalheView } from "../../types";

export function DefinirTipoAto({
  intimacaoId,
  prazo,
  onConfirmado,
  /** Rótulo do CTA — o gate usa "Confirmar e continuar". */
  ctaLabel = "Definir tipo e prazo",
  /** Compacto = sem o control de contagem (usado no gate). */
  compact = false,
}: {
  intimacaoId: string;
  prazo: PrazoDetalheView | null;
  onConfirmado?: () => void;
  ctaLabel?: string;
  compact?: boolean;
}) {
  const c = useDefinirTipo({ intimacaoId, prazo, onConfirmado });
  const {
    control,
    formState: { errors },
  } = c.form;

  return (
    <form onSubmit={c.onConfirmar} noValidate className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field data-invalid={!!errors.tipo_ato}>
          <FieldLabel htmlFor="definir-tipo-ato">Tipo do ato</FieldLabel>
          <Controller
            name="tipo_ato"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value || ""}
                onValueChange={(v) => field.onChange(v ?? "")}
              >
                <SelectTrigger
                  id="definir-tipo-ato"
                  className="w-full"
                  aria-invalid={!!errors.tipo_ato}
                >
                  <SelectValue placeholder="Selecione o tipo">
                    {field.value
                      ? (TIPO_ATO_LABEL[field.value] ?? "Selecione o tipo")
                      : "Selecione o tipo"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {c.options.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.tipo_ato]} />
        </Field>

        <Field data-invalid={!!errors.days}>
          <FieldLabel htmlFor="definir-tipo-dias">Prazo em dias</FieldLabel>
          <Input
            id="definir-tipo-dias"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="Informe os dias"
            aria-invalid={!!errors.days}
            {...c.form.register("days", { valueAsNumber: true })}
          />
          <FieldError errors={[errors.days]} />
        </Field>
      </div>

      {compact ? null : (
        <Field data-invalid={!!errors.counting}>
          <FieldLabel htmlFor="definir-tipo-contagem">Contagem</FieldLabel>
          <Controller
            name="counting"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) =>
                  field.onChange((v as "BUSINESS" | "CALENDAR") ?? "BUSINESS")
                }
              >
                <SelectTrigger
                  id="definir-tipo-contagem"
                  className="w-full sm:w-56"
                  aria-invalid={!!errors.counting}
                >
                  <SelectValue>
                    {field.value === "CALENDAR"
                      ? "Dias corridos"
                      : "Dias úteis"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="BUSINESS">Dias úteis</SelectItem>
                    <SelectItem value="CALENDAR">Dias corridos</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.counting]} />
        </Field>
      )}

      <div
        role="status"
        aria-live="polite"
        className="text-muted-foreground text-sm"
      >
        {c.previewPendente
          ? "Calculando vencimento…"
          : c.previewErro
            ? "Não foi possível calcular o vencimento."
            : c.preview
              ? `Vencimento previsto: ${formatarData(c.preview.end_date)} · ${c.preview.weekday}.`
              : "Escolha o tipo e informe os dias para ver o vencimento."}
        {c.previewErro ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 block"
            onClick={c.onRetryPreview}
          >
            Recalcular
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!c.podeConfirmar}>
          {c.emVoo ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Check data-icon="inline-start" />
          )}
          {c.emVoo ? "Salvando…" : ctaLabel}
        </Button>
        {c.podeSemPrazo ? (
          <Button
            type="button"
            variant="ghost"
            disabled={c.emVoo}
            onClick={c.onSemPrazo}
          >
            Não há prazo
          </Button>
        ) : null}
      </div>

      {c.erro ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível salvar. Tente novamente.
        </p>
      ) : null}
    </form>
  );
}
