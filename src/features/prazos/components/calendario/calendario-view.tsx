"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { ShellHeader } from "@/components/shell/page-frame";
import { cn } from "@/lib/utils";

import { usePrazosCalendario } from "../../hooks/use-prazos-calendario";
import { Dia } from "./dia";
import { Mes } from "./mes";
import { Semana } from "./semana";

export type CalModel = ReturnType<typeof usePrazosCalendario>;

// Calendário estilo Google (Mês / Semana / Dia), port do template 1532-1708.
// Cabeçalho padrão com navegação e alternância entre mês, semana e dia.
export function CalendarioView() {
  const cal = usePrazosCalendario();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <ShellHeader>
        <CalendarDays className="text-fg2 size-4" strokeWidth={1.9} />
        <span className="text-[13px] font-medium">Calendário</span>
        <div className="hidden sm:block">
          <DateNavigation cal={cal} />
        </div>
        <span className="text-fg3 ml-1 font-mono text-[11px] capitalize">
          {cal.titulo}
        </span>
        <div className="ml-auto hidden shrink-0 sm:block">
          <ViewSwitcher cal={cal} />
        </div>
      </ShellHeader>
      <div className="border-line flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-2 sm:hidden">
        <DateNavigation cal={cal} />
        <ViewSwitcher cal={cal} />
      </div>

      {cal.ehMes ? (
        <Mes cal={cal} />
      ) : cal.ehSemana ? (
        <Semana cal={cal} />
      ) : (
        <Dia cal={cal} />
      )}
    </div>
  );
}

function DateNavigation({ cal }: { cal: CalModel }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        onClick={cal.prev}
        aria-label="Anterior"
        className="text-fg3 hover:bg-hover grid size-6 place-items-center rounded-md"
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
      </button>
      <button
        onClick={cal.next}
        aria-label="Próximo"
        className="text-fg3 hover:bg-hover grid size-6 place-items-center rounded-md"
      >
        <ChevronRight className="size-4" strokeWidth={2} />
      </button>
      <button
        onClick={cal.hoje}
        className="border-line bg-panel text-fg2 hover:bg-hover ml-1 rounded-md border px-2.5 py-1 text-[11.5px]"
      >
        Hoje
      </button>
    </div>
  );
}

function ViewSwitcher({ cal }: { cal: CalModel }) {
  return (
    <div className="bg-hover flex shrink-0 items-center gap-0.5 rounded-md p-0.5">
      <Seg label="Mês" active={cal.ehMes} onClick={cal.setMes} />
      <Seg label="Semana" active={cal.ehSemana} onClick={cal.setSemana} />
      <Seg label="Dia" active={cal.ehDia} onClick={cal.setDia} />
    </div>
  );
}

function Seg({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[5px] px-3 py-1 text-[12px] font-medium transition-colors",
        active
          ? "bg-panel text-foreground shadow-[0_1px_2px_oklch(0.27_0.012_200_/_14%)]"
          : "text-fg2 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
