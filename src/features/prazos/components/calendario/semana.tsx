"use client";

import type { CalModel } from "./calendario-view";

// Semana: 5 cards de dia útil (seg–sex), cada um com seus prazos fatais.
export function Semana({ cal }: { cal: CalModel }) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[repeat(5,minmax(190px,1fr))] items-start gap-3 overflow-auto p-6">
      {cal.semana.map((d) => (
        <div
          key={d.data}
          className="bg-panel overflow-hidden rounded-xl border"
          style={{
            borderColor: d.hoje
              ? "color-mix(in oklch, var(--primary) 40%, transparent)"
              : "var(--line)",
          }}
        >
          <div
            className="border-line2 flex items-baseline justify-between border-b px-3 py-2.5"
            style={{
              background: d.hoje
                ? "color-mix(in oklch, var(--primary) 6%, transparent)"
                : "var(--bg)",
            }}
          >
            <span className="text-[12px] font-semibold capitalize">
              {d.dow}
            </span>
            <span className="text-fg3 font-mono text-[11px]">{d.data}</span>
          </div>
          <div className="flex min-h-[80px] flex-col gap-1.5 p-[7px]">
            {d.vazio ? (
              <div className="py-2.5 text-center text-[11px] text-[color-mix(in_oklch,var(--fg3)_60%,transparent)]">
                livre
              </div>
            ) : (
              d.evs.map((e) => (
                <button
                  key={e.id}
                  onClick={e.onOpen}
                  className="bg-bg block w-full rounded-[7px] border px-2.5 py-[7px] text-left"
                  style={{ borderLeft: `3px solid ${e.urgCor}` }}
                >
                  <span className="block truncate text-[12px] font-medium">
                    {e.providencia}
                  </span>
                  <span className="text-fg3 mt-px block text-[10.5px]">
                    fatal · {e.prazoCurto}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
