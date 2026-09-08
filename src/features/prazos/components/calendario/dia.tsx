"use client";

import type { CalModel } from "./calendario-view";
import { EventoCalendario } from "./evento";

// Prazos e providências têm vencimento por data, sem um horário agendado.
export function Dia({ cal }: { cal: CalModel }) {
  const d = cal.dia;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-line flex shrink-0 flex-wrap items-center gap-2.5 border-b px-4 py-3">
        <span className="font-medium capitalize">
          {d.dow} · {d.data}
        </span>
        <span className="text-muted-foreground text-xs">
          {d.allday.length}{" "}
          {d.allday.length === 1 ? "vencimento" : "vencimentos"} · dia todo
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {d.allday.map((e) => (
          <EventoCalendario key={e.id} evento={e} />
        ))}
        {!d.temAllday && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Nenhum prazo ou providência com vencimento neste dia.
          </p>
        )}
      </div>
    </div>
  );
}
