"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { CalModel } from "./calendario-view";

// Dia: cabeçalho com navegação, faixa "dia todo" (prazos fatais) e grade de
// horas 08–19h com as audiências posicionadas por horário.
export function Dia({ cal }: { cal: CalModel }) {
  const d = cal.dia;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-line flex shrink-0 items-center gap-2.5 border-b px-6 py-2.5">
        <button
          onClick={d.prev}
          className="text-fg3 hover:bg-hover grid size-6 place-items-center rounded-md"
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>
        <button
          onClick={d.next}
          className="text-fg3 hover:bg-hover grid size-6 place-items-center rounded-md"
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
        <button
          onClick={d.hoje}
          className="border-line bg-panel text-fg2 hover:bg-hover ml-1 rounded-md border px-2.5 py-1 text-[11.5px]"
        >
          Hoje
        </button>
        <span className="font-display ml-2 text-[15px] capitalize">
          {d.dow}
        </span>
        <span className="text-fg3 ml-1 font-mono text-[12px]">{d.data}</span>
      </div>

      {d.temAllday ? (
        <div className="border-line grid shrink-0 grid-cols-[66px_1fr] border-b">
          <div className="border-line2 text-fg3 border-r px-2 py-2 text-right text-[10.5px]">
            dia todo
          </div>
          <div className="flex flex-wrap gap-1.5 px-3.5 py-2">
            {d.allday.map((e) => (
              <button
                key={e.id}
                onClick={e.onOpen}
                className="bg-panel inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11.5px]"
                style={{ borderLeft: `3px solid ${e.urgCor}` }}
              >
                <span className="font-medium">{e.providencia}</span>
                <span className="text-fg3">· {e.cliente}</span>
                <span className="font-mono" style={{ color: e.urgCor }}>
                  fatal
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[66px_1fr]">
          <div>
            {d.horas.map((h) => (
              <div
                key={h.label}
                className="border-line2 text-fg3 box-border h-[56px] border-r px-2 pt-0.5 text-right text-[10.5px]"
              >
                {h.label}
              </div>
            ))}
          </div>
          <div className="relative">
            {d.horas.map((h) => (
              <div
                key={h.label}
                className="border-line2 box-border h-[56px] border-b"
              />
            ))}
            {d.eventos.map((ev, i) => (
              <button
                key={i}
                onClick={ev.onOpen}
                className="absolute right-3.5 left-2.5 overflow-hidden rounded-lg border px-2.5 py-1.5 text-left"
                style={{
                  top: ev.top,
                  height: ev.altura,
                  borderColor: ev.cor,
                  borderLeft: `3px solid ${ev.cor}`,
                  background: ev.fundo,
                }}
              >
                <span className="block text-[12px] font-medium">
                  {ev.hora} · {ev.titulo}
                </span>
                <span className="text-fg3 mt-px block text-[11px]">
                  {ev.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
