"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { CalModel } from "./calendario-view";
import { EventoCalendario } from "./evento";

// Grade do mês (7 colunas, semanas), fiel ao template. Dia com evento mostra até
// 3 chips + "+N mais"; o dia de HOJE (dinâmico) fica destacado.
export function Mes({ cal }: { cal: CalModel }) {
  const [expandidos, setExpandidos] = useState<Set<string>>(() => new Set());
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line grid shrink-0 grid-cols-7 border-b">
        {cal.diasSemana.map((w) => (
          <div
            key={w}
            className="text-fg3 px-2.5 py-[7px] text-right text-[10.5px] font-medium tracking-[0.04em] uppercase"
          >
            {w}
          </div>
        ))}
      </div>
      <div
        className="grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateRows: `repeat(${cal.mes.length}, minmax(0, 1fr))`,
        }}
      >
        {cal.mes.map((wk, wi) => (
          <div
            key={wi}
            className="border-line2 grid min-h-0 grid-cols-7 overflow-hidden border-b"
          >
            {wk.dias.map((d, di) => (
              <div
                key={di}
                data-calendar-day={d.dataISO}
                className="border-line2 flex min-h-0 min-w-0 flex-col overflow-hidden border-r px-[5px] py-1"
                style={{
                  background: d.hoje
                    ? "color-mix(in oklch, var(--primary) 5%, transparent)"
                    : "transparent",
                }}
              >
                {d.vazia ? null : (
                  <>
                    <div className="flex shrink-0 justify-end px-1 py-0.5">
                      <span
                        className="grid size-[22px] place-items-center rounded-full text-[12px] tabular-nums"
                        style={{
                          background: d.hoje ? "var(--primary)" : "transparent",
                          color: d.hoje
                            ? "var(--primary-foreground)"
                            : "var(--fg2)",
                        }}
                      >
                        {d.num}
                      </span>
                    </div>
                    {d.temEv ? (
                      <div className="flex min-h-0 flex-1 flex-col gap-1">
                        <div
                          id={`eventos-${d.dataISO}`}
                          className="flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-contain"
                        >
                          {(expandidos.has(d.dataISO!)
                            ? d.evs
                            : d.evs?.slice(0, 3)
                          )?.map((e) => (
                            <EventoCalendario
                              key={e.id}
                              evento={e}
                              densidade="mes"
                            />
                          ))}
                        </div>
                        {d.temExtra && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-full shrink-0 justify-start overflow-hidden px-1.5 text-[11px]"
                            aria-expanded={expandidos.has(d.dataISO!)}
                            aria-controls={`eventos-${d.dataISO}`}
                            onClick={() =>
                              setExpandidos((current) => {
                                const next = new Set(current);
                                if (next.has(d.dataISO!))
                                  next.delete(d.dataISO!);
                                else next.add(d.dataISO!);
                                return next;
                              })
                            }
                          >
                            {expandidos.has(d.dataISO!)
                              ? "Recolher"
                              : `+${d.extra} ${d.evs?.every((e) => e.tipo === "prazo") ? "prazos" : "itens"}`}
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
