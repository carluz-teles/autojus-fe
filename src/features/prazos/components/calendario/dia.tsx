"use client";

import Link from "next/link";

import type { CalModel } from "./calendario-view";

// Dia: cabeçalho com navegação, faixa "dia todo" (prazos + providências) e grade
// de horas 08–19h. Sem eventos posicionados por horário — não há domínio de
// audiência no BE (fora de escopo).
export function Dia({ cal }: { cal: CalModel }) {
  const d = cal.dia;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-line flex shrink-0 items-center gap-2.5 border-b px-6 py-2.5">
        <span className="font-display text-[15px] capitalize">{d.dow}</span>
        <span className="text-fg3 ml-1 font-mono text-[12px]">{d.data}</span>
      </div>

      {d.temAllday ? (
        <div className="border-line grid shrink-0 grid-cols-[66px_1fr] border-b">
          <div className="border-line2 text-fg3 border-r px-2 py-2 text-right text-[10.5px]">
            dia todo
          </div>
          <div className="flex flex-wrap gap-1.5 px-3.5 py-2">
            {d.allday.map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className="bg-panel inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11.5px]"
                style={{ borderLeft: `3px solid ${e.urgCor}` }}
              >
                <span className="font-medium">{e.titulo}</span>
                {e.sub ? <span className="text-fg3">· {e.sub}</span> : null}
                <span className="font-mono" style={{ color: e.urgCor }}>
                  {e.tipo === "prazo" ? "fatal" : "vence"}
                </span>
              </Link>
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
          </div>
        </div>
      </div>
    </div>
  );
}
