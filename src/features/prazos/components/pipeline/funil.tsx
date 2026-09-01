"use client";

import type { usePrazosPipeline } from "../../hooks/use-prazos-pipeline";
import { StatusIcon } from "../icons";

// Funil de processos: onde o volume está parado. Cada etapa mostra a barra de
// volume, o percentual e o selo "gargalo" quando concentra demais.
export function Funil({
  pipeline,
}: {
  pipeline: ReturnType<typeof usePrazosPipeline>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-[30px] pb-10">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[13px] font-medium">Funil de processos</span>
          <span className="text-fg3 text-[12px]">
            {pipeline.totalAtivos} ativos
          </span>
        </div>
        <p className="text-fg3 mb-[22px] text-[12.5px] leading-[1.5]">
          Onde o volume está parado. A largura da barra é relativa à maior
          etapa.
        </p>
        {pipeline.funil.map((e) => (
          <div key={e.key} className="rounded-lg px-2 py-2.5">
            <div className="flex items-center gap-2.5">
              <StatusIcon k={e.key} size={16} />
              <span className="text-[13px] font-medium">{e.label}</span>
              {e.gargalo ? (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{
                    background:
                      "color-mix(in oklch, var(--gold) 15%, transparent)",
                    color: "var(--gold)",
                  }}
                >
                  gargalo
                </span>
              ) : null}
              <span className="ml-auto font-mono text-[13px] font-medium">
                {e.n}
              </span>
              <span className="text-fg3 w-[42px] text-right font-mono text-[11px]">
                {e.pct}
              </span>
            </div>
            <div className="bg-hover mt-[7px] h-3 overflow-hidden rounded">
              <div
                className="h-full rounded"
                style={{ width: e.barW, background: e.cor }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
