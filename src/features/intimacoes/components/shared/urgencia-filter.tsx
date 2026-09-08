"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";

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

import { dataDoFiltro } from "../../lib/intervalo-vencimento";
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
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [editing, setEditing] = useState(false);
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
          setDraftFrom(from);
          setDraftTo(to);
          setEditing(false);
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
            <Calendar
              mode="range"
              locale={ptBR}
              selected={range}
              defaultMonth={inicio}
              className="mx-auto [--cell-size:--spacing(8)]"
              onSelect={(next) => {
                setEditing(true);
                setDraftFrom(next?.from ? format(next.from, "yyyy-MM-dd") : "");
                setDraftTo(next?.to ? format(next.to, "yyyy-MM-dd") : "");
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel htmlFor="urgencia-de">De</FieldLabel>
                <Input
                  id="urgencia-de"
                  type="date"
                  value={draftFrom}
                  onChange={(e) => {
                    setEditing(true);
                    setDraftFrom(e.target.value);
                  }}
                />
              </Field>
              <Field data-invalid={!!inicio && !!fim && !valid}>
                <FieldLabel htmlFor="urgencia-ate">Até</FieldLabel>
                <Input
                  id="urgencia-ate"
                  type="date"
                  value={draftTo}
                  min={draftFrom || undefined}
                  aria-invalid={!!inicio && !!fim && !valid}
                  onChange={(e) => {
                    setEditing(true);
                    setDraftTo(e.target.value);
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
              onRange(draftFrom, draftTo);
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
