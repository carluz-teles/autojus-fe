"use client";

import type { CalModel } from "./calendario-view";

// Grade do mês (7 colunas, semanas), fiel ao template. Dia com fatal mostra até
// 3 chips + "+N mais"; "hoje" (02/09) fica destacado.
export function Mes({ cal }: { cal: CalModel }) {
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
      <div className="flex flex-1 flex-col overflow-y-auto">
        {cal.mes.map((wk, wi) => (
          <div
            key={wi}
            className="border-line2 grid min-h-[116px] flex-1 grid-cols-7 border-b"
          >
            {wk.dias.map((d, di) => (
              <div
                key={di}
                className="border-line2 min-w-0 border-r px-[5px] py-1"
                style={{
                  background: d.hoje
                    ? "color-mix(in oklch, var(--primary) 5%, transparent)"
                    : "transparent",
                }}
              >
                {d.vazia ? null : (
                  <>
                    <div className="flex justify-end px-1 py-0.5">
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
                      <div className="flex flex-col gap-[3px]">
                        {d.evs?.map((e) => (
                          <button
                            key={e.id}
                            onClick={e.onOpen}
                            title={`${e.providencia} · ${e.cliente}`}
                            className="flex w-full items-center gap-1.5 rounded-[5px] px-1.5 py-0.5 text-left"
                            style={{ background: e.chipFundo }}
                          >
                            <span
                              className="size-[5px] shrink-0 rounded-full"
                              style={{ background: e.urgCor }}
                            />
                            <span className="text-foreground truncate text-[11px]">
                              {e.providencia}
                            </span>
                          </button>
                        ))}
                        {d.temExtra ? (
                          <span className="text-fg3 pl-1.5 text-[10.5px]">
                            +{d.extra} mais
                          </span>
                        ) : null}
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
