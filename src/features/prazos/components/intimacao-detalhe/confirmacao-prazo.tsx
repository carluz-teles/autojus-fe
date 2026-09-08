"use client";

import { ChevronDown, TriangleAlert } from "lucide-react";
import { Controller } from "react-hook-form";

import { DetailCard as Card } from "@/components/shell/detail-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TIPOS_COM_PRAZO } from "../../lib/confirmacao";
import type { PrazoDetalheView } from "../../types";

export function ConfirmacaoPrazo({
  id,
  prazo,
  estado,
}: {
  id: string;
  prazo: PrazoDetalheView;
  estado: string;
}) {
  const c = useConfirmacaoPrazo(id, prazo, estado);
  const {
    register,
    control,
    formState: { errors },
  } = c.form;

  if (!c.pendente) return null;

  return (
    <Card role="region" aria-label="Confirmação de tipo e prazo">
      <CardHeader>
        <CardTitle>
          <h2>
            {estado === "a_classificar"
              ? "Definir tipo e prazo"
              : "Confirmar tipo e prazo"}
          </h2>
        </CardTitle>
        <CardDescription>
          {estado === "a_classificar"
            ? "O prazo ainda não foi definido. Revise o teor da intimação e informe o tipo do ato e a contagem, ou declare que não há prazo."
            : "O tipo e o prazo precisam da sua revisão. Confira o teor da intimação antes de confirmar os dados abaixo."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {c.semPrazo ? (
          <div className="flex flex-col gap-4">
            <Alert>
              <TriangleAlert />
              <AlertTitle>Declarar que não há prazo</AlertTitle>
              <AlertDescription>
                Essa decisão registra a intimação como ciência e encerra a
                pendência de classificação.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button disabled={c.emVoo} onClick={c.onConfirmarSemPrazo}>
                Confirmar ausência de prazo
              </Button>
              <Button variant="outline" disabled={c.emVoo} onClick={c.onVoltar}>
                Voltar à definição do prazo
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={c.onSubmit} noValidate>
            <fieldset
              disabled={c.emVoo}
              className="flex min-w-0 flex-col gap-5"
            >
              <legend className="sr-only">
                Tipo do ato e contagem do prazo
              </legend>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Field data-invalid={!!errors.tipo_ato}>
                  <FieldLabel htmlFor="confirmacao-tipo">
                    Tipo do ato
                  </FieldLabel>
                  <NativeSelect
                    id="confirmacao-tipo"
                    className="w-full"
                    aria-invalid={!!errors.tipo_ato}
                    {...register("tipo_ato")}
                  >
                    <NativeSelectOption value="">
                      Selecione o tipo
                    </NativeSelectOption>
                    {TIPOS_COM_PRAZO.map(([value, label]) => (
                      <NativeSelectOption key={value} value={value}>
                        {label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[errors.tipo_ato]} />
                </Field>
                <Field data-invalid={!!errors.days}>
                  <FieldLabel htmlFor="confirmacao-dias">
                    Prazo em dias
                  </FieldLabel>
                  <Input
                    id="confirmacao-dias"
                    type="number"
                    min={1}
                    step={1}
                    placeholder="Informe os dias"
                    aria-invalid={!!errors.days}
                    {...register("days", { valueAsNumber: true })}
                  />
                  <FieldError errors={[errors.days]} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmacao-contagem">
                    Contagem
                  </FieldLabel>
                  <NativeSelect
                    id="confirmacao-contagem"
                    className="w-full"
                    {...register("counting")}
                  >
                    <NativeSelectOption value="BUSINESS">
                      Dias úteis
                    </NativeSelectOption>
                    <NativeSelectOption value="CALENDAR">
                      Dias corridos
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              </FieldGroup>
              <details className="group border-border rounded-lg border">
                <summary className="focus-visible:ring-ring flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg p-3 text-sm outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                  <span>
                    Ajustes de contagem
                    {c.ajustesResumo ? (
                      <span className="text-muted-foreground mt-1 block text-xs">
                        {c.ajustesResumo}
                      </span>
                    ) : null}
                  </span>
                  <ChevronDown className="size-4 shrink-0 group-open:rotate-180" />
                </summary>
                <FieldGroup className="gap-4 px-3 pb-3">
                  <Field>
                    <FieldLabel htmlFor="confirmacao-inicio">
                      Termo inicial
                    </FieldLabel>
                    <NativeSelect
                      id="confirmacao-inicio"
                      className="w-full"
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
                    <FieldLabel htmlFor="confirmacao-extras">
                      Dias adicionais
                    </FieldLabel>
                    <Input
                      id="confirmacao-extras"
                      type="number"
                      min={0}
                      step={1}
                      aria-invalid={!!errors.manual_extra_days}
                      {...register("manual_extra_days", {
                        valueAsNumber: true,
                      })}
                    />
                    <FieldError errors={[errors.manual_extra_days]} />
                  </Field>
                  <Field orientation="horizontal">
                    <Controller
                      name="doubled"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="confirmacao-dobro"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <FieldLabel htmlFor="confirmacao-dobro">
                      Aplicar prazo em dobro
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </details>
              <div
                role="status"
                aria-live="polite"
                className="text-muted-foreground text-sm"
              >
                {c.previewPendente
                  ? "Calculando vencimento…"
                  : c.preview
                    ? `Vencimento previsto: ${formatarData(c.preview.end_date)} · ${c.preview.weekday}.`
                    : "Preencha o tipo e os dias para visualizar o vencimento."}
                {c.previewErro ? (
                  <p role="alert">
                    Não foi possível calcular o vencimento. Confira os dados ou
                    tente novamente.
                  </p>
                ) : null}
                {c.previewErro ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={c.onRetryPreview}
                  >
                    Recalcular vencimento
                  </Button>
                ) : null}
              </div>
              <Field orientation="horizontal" data-invalid={!!errors.revisado}>
                <Controller
                  name="revisado"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="confirmacao-revisado"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={!!errors.revisado}
                    />
                  )}
                />
                <FieldLabel htmlFor="confirmacao-revisado">
                  Revisei o tipo do ato e a contagem do prazo.
                </FieldLabel>
              </Field>
              <div className="flex flex-col gap-2">
                <Button type="submit" disabled={!c.podeConfirmar}>
                  {c.emVoo ? "Registrando…" : "Confirmar tipo e prazo"}
                </Button>
                {prazo.status !== "MISSED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={c.onSemPrazo}
                  >
                    Não há prazo
                  </Button>
                ) : null}
              </div>
            </fieldset>
          </form>
        )}
        {c.erro ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            A revisão não foi salva. Seus dados foram mantidos; tente novamente.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
