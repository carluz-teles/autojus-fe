"use client";

import { Check, LoaderCircle } from "lucide-react";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDefinirTipo } from "@/features/prazos/hooks/use-definir-tipo";
import { formatarData } from "@/lib/utils";

import type { PrazoDetalheView } from "../../types";

export function DefinirTipoAto({
  intimacaoId,
  prazo,
  onConfirmado,
  onCancelar,
  ctaLabel = "Confirmar tipo do ato",
  showDefinirForm = true,
  semPrazoLabel = "Não há prazo",
}: {
  intimacaoId: string;
  prazo: PrazoDetalheView | null;
  onConfirmado?: () => void;
  onCancelar?: () => void;
  ctaLabel?: string;
  compact?: boolean;
  showDefinirForm?: boolean;
  semPrazoLabel?: string;
}) {
  const c = useDefinirTipo({ intimacaoId, prazo, onConfirmado });
  const {
    control,
    formState: { errors },
  } = c.form;
  return (
    <form onSubmit={c.onConfirmar} noValidate className="flex flex-col gap-4">
      {showDefinirForm ? (
        <>
          <Field data-invalid={!!errors.tipo_ato}>
            <FieldLabel htmlFor="definir-tipo-ato">Tipo do ato</FieldLabel>
            <Controller
              name="tipo_ato"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger
                    id="definir-tipo-ato"
                    className="w-full"
                    disabled={
                      c.catalogPendente ||
                      c.catalogErro ||
                      c.options.length === 0
                    }
                    aria-invalid={!!errors.tipo_ato}
                  >
                    <SelectValue placeholder="Selecione o tipo">
                      {c.options.find((item) => item.key === field.value)
                        ?.label ?? "Selecione o tipo"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {c.options.map((item) => (
                        <SelectItem key={item.key} value={item.key}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.tipo_ato]} />
          </Field>
          {c.catalogPendente ? (
            <p role="status" className="text-muted-foreground text-xs">
              Carregando tipos disponíveis…
            </p>
          ) : null}
          {c.catalogErro ? (
            <div role="alert" className="text-destructive text-xs">
              Não foi possível carregar os tipos disponíveis.
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={c.onRetryCatalog}
              >
                Tentar novamente
              </Button>
            </div>
          ) : null}
          {!c.catalogPendente && !c.catalogErro && c.options.length === 0 ? (
            <p role="note" className="text-muted-foreground text-xs">
              Não há tipos disponíveis para as regras deste prazo. Confira a
              classificação com a equipe antes de prosseguir.
            </p>
          ) : null}
          <div
            role="status"
            aria-live="polite"
            className="surface-inset flex flex-col gap-2 p-3 text-sm"
          >
            <p className="text-muted-foreground text-xs font-medium">
              Efeito no prazo
            </p>
            {c.previewPendente ? (
              <p className="text-muted-foreground flex items-center gap-2">
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Calculando…
              </p>
            ) : c.previewErro ? (
              <p className="text-destructive">
                Não foi possível calcular a sugestão.
              </p>
            ) : c.preview ? (
              <>
                <p className="text-foreground font-medium">
                  {c.preview.calculation.end_date
                    ? `Vencimento sugerido: ${formatarData(c.preview.calculation.end_date)}.`
                    : "A regra exige revisão do termo inicial."}
                </p>
                {c.preview.calculation.fallback_used ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Base genérica usada; confira a regra antes de revisar o
                    prazo.
                  </p>
                ) : null}
                {c.preview.preserved_deadline ? (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    O vencimento atual está protegido e será mantido. A sugestão
                    não o substitui.
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
                Escolha um tipo para ver a sugestão de cálculo.
              </p>
            )}
            {c.previewErro ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={c.onRetryPreview}
              >
                Recalcular
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
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
        {!showDefinirForm && c.podeSemPrazo ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={c.emVoo}
            onClick={c.onSemPrazo}
          >
            {semPrazoLabel}
          </Button>
        ) : null}
        {showDefinirForm ? (
          <Button type="submit" disabled={!c.podeConfirmar}>
            {c.emVoo ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            {c.emVoo ? "Salvando…" : ctaLabel}
          </Button>
        ) : null}
      </div>
      {c.staleError ? (
        <p role="alert" className="text-destructive text-sm">
          O prazo mudou. Confira os dados atualizados antes de tentar novamente.
        </p>
      ) : c.erro ? (
        <p role="alert" className="text-destructive text-sm">
          Não foi possível salvar. Tente novamente.
        </p>
      ) : null}
    </form>
  );
}
