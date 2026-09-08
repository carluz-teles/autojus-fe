"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { ptBR } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { dataDoFiltro } from "@/features/intimacoes/lib/intervalo-vencimento";

export function InternalDueDate({
  valor,
  onChange,
  disabled = false,
}: {
  valor: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = dataDoFiltro(valor);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label="Alterar entrega interna"
        render={<Button variant="outline" className="justify-start" />}
      >
        <CalendarDays data-icon="inline-start" />
        {date ? format(date, "dd/MM/yyyy") : "Definir data"}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto max-w-[var(--available-width)]"
      >
        <PopoverHeader>
          <PopoverTitle>Entrega interna</PopoverTitle>
        </PopoverHeader>
        <Calendar
          mode="single"
          locale={ptBR}
          selected={date}
          defaultMonth={date || new Date()}
          disabled={disabled}
          onSelect={(day) => {
            onChange(day ? format(day, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
        />
        <Button
          variant="ghost"
          className="w-full"
          disabled={disabled || !valor}
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Remover data
        </Button>
      </PopoverContent>
    </Popover>
  );
}
