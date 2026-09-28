"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { useForm, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  brParaISO,
  dataDoFiltro,
  intervaloMesAtual,
  isoParaBR,
  mascararDataBR,
} from "../../lib/intervalo-vencimento";
import type { FilterTab } from "./filter-tabs";

export function UrgenciaFilter({
  tabs,
  urgency,
  from,
  to,
  onRange,
}: {
  tabs: FilterTab[];
  urgency: string;
  from: string;
  to: string;
  onRange: (from: string, to: string) => void;
}) {
  // O intervalo em rascunho (De/Até + o flag "editing") É um formulário — dois
  // campos com validação cruzada ("data final ≥ inicial"). Estado via RHF; as
  // derivações (validade, range do calendário) reagem por useWatch. O `open` do
  // popover é estado de UI puro, não valor de campo — segue como useState.
  const [open, setOpen] = useState(false);
  const { control, setValue, getValues, reset } = useForm({
    defaultValues: { from, to, editing: false },
  });
  const draftFrom = useWatch({ control, name: "from" });
  const draftTo = useWatch({ control, name: "to" });
  const editing = useWatch({ control, name: "editing" });
  const inicio = dataDoFiltro(draftFrom);
  const fim = dataDoFiltro(draftTo);
  const valid = !!inicio && !!fim && draftFrom <= draftTo;
  const range: DateRange | undefined = inicio
    ? { from: inicio, to: fim }
    : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) {
          reset({ from, to, editing: false });
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="h-8" />}
        aria-label="Filtrar por urgência ou intervalo de vencimento"
      >
        <CalendarDays data-icon="inline-start" /> Urgência
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-[var(--available-height)] w-[min(34rem,var(--available-width))] overflow-y-auto p-3"
      >
        <PopoverHeader>
          <PopoverTitle>Vencimento</PopoverTitle>
          <PopoverDescription>
            Escolha uma urgência ou um intervalo no calendário.
          </PopoverDescription>
        </PopoverHeader>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ToggleGroup
            aria-label="Atalhos de urgência"
            variant="outline"
            size="sm"
            className="grid w-full auto-rows-fr grid-cols-1 content-start items-stretch min-[360px]:grid-cols-2 sm:w-52 sm:grid-cols-1"
            value={editing || from || to ? [] : [urgency || "todas"]}
            onValueChange={(values) => {
              const key = String(values[0] || "todas");
              tabs.find((t) => (t.key || "todas") === key)?.onClick();
              setOpen(false);
            }}
          >
            {tabs.map((tab) => (
              <ToggleGroupItem
                key={tab.key || "todas"}
                value={tab.key || "todas"}
                className="h-full min-h-8 justify-between gap-2 py-1.5"
              >
                <span className="min-w-0 text-left whitespace-normal">
                  {tab.label}
                </span>
                {tab.count != null && (
                  <Badge variant="secondary">
                    {tab.count.toLocaleString("pt-BR")}
                  </Badge>
                )}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {/* Atalho "Este mês" = mês-CALENDÁRIO (1º→último dia), aplicado como
                intervalo real via onRange. Distinto do bucket disjunto "Após 7 dias,
                neste mês" nas tabs; por ser intervalo, não carrega contagem. */}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Atalho</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => {
                  const mes = intervaloMesAtual(new Date());
                  onRange(mes.from, mes.to);
                  setOpen(false);
                }}
              >
                Este mês
              </Button>
            </div>
            <Calendar
              mode="range"
              locale={ptBR}
              selected={range}
              defaultMonth={inicio}
              className="mx-auto [--cell-size:--spacing(8)]"
              onSelect={(next) => {
                setValue("editing", true);
                setValue(
                  "from",
                  next?.from ? format(next.from, "yyyy-MM-dd") : "",
                );
                setValue("to", next?.to ? format(next.to, "yyyy-MM-dd") : "");
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel htmlFor="urgencia-de">De</FieldLabel>
                <CampoDataBR
                  id="urgencia-de"
                  value={draftFrom}
                  onChangeISO={(iso) => {
                    setValue("editing", true);
                    setValue("from", iso);
                  }}
                />
              </Field>
              <Field data-invalid={!!inicio && !!fim && !valid}>
                <FieldLabel htmlFor="urgencia-ate">Até</FieldLabel>
                <CampoDataBR
                  id="urgencia-ate"
                  value={draftTo}
                  invalid={!!inicio && !!fim && !valid}
                  onChangeISO={(iso) => {
                    setValue("editing", true);
                    setValue("to", iso);
                  }}
                />
              </Field>
            </div>
            {inicio && fim && !valid && (
              <p role="alert" className="text-destructive text-xs">
                A data final deve ser igual ou posterior à inicial.
              </p>
            )}
          </div>
        </div>
        <Separator />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            onClick={() => {
              onRange(getValues("from"), getValues("to"));
              setOpen(false);
            }}
          >
            Aplicar intervalo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Campo de data com entrada manual no padrão BR (dd/mm/aaaa) sobre o MESMO <Input>
// do app — exibição brasileira, wire ISO (yyyy-MM-dd). NÃO é um DateInput separado
// nem um datepicker: é só a extensão dos campos De/Até deste filtro compartilhado.
// Mantém um buffer local de digitação sincronizado ao valor ISO externo (ex.: uma
// seleção pelo calendário) sem atropelar uma digitação parcial em andamento.
function CampoDataBR({
  id,
  value,
  invalid,
  onChangeISO,
}: {
  id: string;
  /** Valor ISO ("" | yyyy-MM-dd). */
  value: string;
  invalid?: boolean;
  /** ISO válido, ou "" enquanto a data está incompleta/inválida. */
  onChangeISO: (iso: string) => void;
}) {
  const [texto, setTexto] = useState(() => isoParaBR(value));
  // Sincroniza a exibição quando o ISO externo muda (ex.: seleção pelo calendário)
  // sem atropelar uma digitação parcial — padrão React de ajustar estado durante o
  // render (sem effect): só reseta o buffer quando o novo ISO diverge do digitado.
  const [ultimoISO, setUltimoISO] = useState(value);
  if (value !== ultimoISO) {
    setUltimoISO(value);
    if (brParaISO(texto) !== value) setTexto(isoParaBR(value));
  }
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="dd/mm/aaaa"
      value={texto}
      aria-invalid={invalid}
      onChange={(e) => {
        const mascarado = mascararDataBR(e.target.value);
        setTexto(mascarado);
        onChangeISO(brParaISO(mascarado));
      }}
    />
  );
}
