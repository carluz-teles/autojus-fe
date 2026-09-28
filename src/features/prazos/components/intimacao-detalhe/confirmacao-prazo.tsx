"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { formatarData } from "@/lib/utils";

import { useConfirmacaoPrazo } from "../../hooks/use-confirmacao-prazo";
import { tipoRevisaoLabel } from "../../lib/detalhe-apresentacao";
import type { PrazoDetalheView } from "../../types";

export function ConfirmacaoPrazo({
  id,
  prazo,
  estado,
  onConfirmado,
  onCancelar,
  tipoLabel,
}: {
  id: string;
  prazo: PrazoDetalheView;
  estado: string;
  onConfirmado?: () => void;
  onCancelar?: () => void;
  tipoLabel?: string | null;
}) {
  const c = useConfirmacaoPrazo(id, prazo, estado, onConfirmado);
  const {
    register,
    control,
    formState: { errors },
  } = c.form;
  if (!c.pendente && !c.podeSemPrazo) return null;
  const tipoExibido = tipoRevisaoLabel(prazo.tipo_ato, tipoLabel);
  if (!c.pendente) {
    return (
      <div className="flex flex-col gap-4">
        <SemPrazoNotice />
        <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {onCancelar ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelar}
            >
              Cancelar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={c.emVoo}
            onClick={c.onSemPrazo}
          >
            {c.emVoo ? "Registrando…" : "Não há prazo"}
          </Button>
        </div>
        {c.staleError ? (
          <p role="alert" className="text-destructive text-sm">
            O prazo mudou. Confira os dados atualizados antes de tentar
            novamente.
          </p>
        ) : c.erro ? (
          <p role="alert" className="text-destructive text-sm">
            Não foi possível registrar a ausência de prazo. Tente novamente.
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <form onSubmit={c.onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Tipo do ato: {tipoExibido}. Esta ação confirma somente o prazo.
      </p>
      {prazo.current_calculation?.protected ? (
        <p className="text-muted-foreground text-xs">
          A data atual foi protegida por uma decisão anterior. Aceitar a data
          mantém esse vencimento.
        </p>
      ) : null}
      {!c.editando ? (
        <div className="surface-inset p-3 text-sm">
          <p>
            Vencimento registrado:{" "}
            <strong>
              {prazo.end_date ? formatarData(prazo.end_date) : "A definir"}
            </strong>
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Aceitar os dados atuais sem recalcular.
          </p>
        </div>
      ) : (
        <FieldGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field data-invalid={!!errors.days}>
            <FieldLabel htmlFor="revisar-prazo-dias">Prazo em dias</FieldLabel>
            <Input
              id="revisar-prazo-dias"
              type="number"
              min={1}
              step={1}
              aria-invalid={!!errors.days}
              {...register("days", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.days]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="revisar-prazo-contagem">Contagem</FieldLabel>
            <NativeSelect id="revisar-prazo-contagem" {...register("counting")}>
              <NativeSelectOption value="BUSINESS">
                Dias úteis
              </NativeSelectOption>
              <NativeSelectOption value="CALENDAR">
                Dias corridos
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="revisar-prazo-inicio">
              Termo inicial
            </FieldLabel>
            <NativeSelect
              id="revisar-prazo-inicio"
              {...register("anchor_event")}
            >
              <NativeSelectOption value="DEADLINE_START">
                Início informado na intimação
              </NativeSelectOption>
              <NativeSelectOption value="PUBLISHED">
                Publicação
              </NativeSelectOption>
              <NativeSelectOption value="MADE_AVAILABLE">
                Disponibilização
              </NativeSelectOption>
            </NativeSelect>
          </Field>
          <Field data-invalid={!!errors.manual_extra_days}>
            <FieldLabel htmlFor="revisar-prazo-extras">
              Dias adicionais
            </FieldLabel>
            <Input
              id="revisar-prazo-extras"
              type="number"
              min={0}
              step={1}
              aria-invalid={!!errors.manual_extra_days}
              {...register("manual_extra_days", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.manual_extra_days]} />
          </Field>
          <Field orientation="horizontal" className="sm:col-span-2">
            <Controller
              name="doubled"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="revisar-prazo-dobro"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <FieldLabel htmlFor="revisar-prazo-dobro">
              Aplicar prazo em dobro
            </FieldLabel>
          </Field>
        </FieldGroup>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={c.editando ? c.onManter : c.onEditar}
        disabled={c.emVoo}
      >
        {c.editando ? "Manter dados atuais" : "Ajustar contagem"}
      </Button>
      <div
        role="status"
        aria-live="polite"
        className="surface-inset flex flex-col gap-2 p-3 text-sm"
      >
        <p className="text-muted-foreground text-xs font-medium">
          Resultado da revisão
        </p>
        {c.previewPendente ? (
          <p className="text-muted-foreground flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Calculando…
          </p>
        ) : c.previewErro ? (
          <p className="text-destructive">
            Não foi possível calcular a prévia.
          </p>
        ) : c.preview ? (
          <>
            <p className="text-foreground font-medium">
              {c.preview.calculation.end_date
                ? `Vencimento da revisão: ${formatarData(c.preview.calculation.end_date)}.`
                : "Vencimento indisponível para esta revisão."}
            </p>
            {c.preview.calculation.fallback_used ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                O cálculo usa a regra genérica. Confirme apenas após conferir a
                publicação.
              </p>
            ) : null}
            {c.preview.impact_reason ? (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {c.preview.impact_reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-muted-foreground">
            Confira os dados para obter a prévia.
          </p>
        )}
        {c.previewErro ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={c.onRetryPreview}
          >
            Tentar novamente
          </Button>
        ) : null}
      </div>
      <Field orientation="horizontal" data-invalid={!!errors.revisado}>
        <Controller
          name="revisado"
          control={control}
          render={({ field }) => (
            <Checkbox
              id="revisar-prazo-confirmado"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={!!errors.revisado}
            />
          )}
        />
        <FieldLabel htmlFor="revisar-prazo-confirmado">
          Conferi a data e a contagem do prazo.
        </FieldLabel>
        <FieldError errors={[errors.revisado]} />
      </Field>
      {c.podeSemPrazo ? <SemPrazoNotice /> : null}
      <div className="border-border flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        {onCancelar ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        ) : null}
        {c.podeSemPrazo ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={c.emVoo}
            onClick={c.onSemPrazo}
          >
            Não há prazo
          </Button>
        ) : null}
        <Button type="submit" disabled={!c.podeConfirmar}>
          {c.emVoo ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <Check data-icon="inline-start" />
          )}
          {c.emVoo ? "Registrando…" : "Confirmar prazo"}
        </Button>
      </div>
      {c.staleError ? (
        <p role="alert" className="text-destructive text-sm">
          O prazo mudou. Confira os dados atualizados antes de tentar novamente.
        </p>
      ) : c.erro ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível registrar a revisão. Tente novamente.
        </p>
      ) : null}
    </form>
  );
}

function SemPrazoNotice() {
  return (
    <p role="note" className="text-muted-foreground text-xs leading-relaxed">
      Se a publicação não traz prazo a cumprir, registre a ausência de prazo.
      Isso também corrige a classificação para ciência; o atendimento não é
      concluído.
    </p>
  );
}
