"use client";

import type { usePrazosPipeline } from "../../hooks/use-prazos-pipeline";
import { StatusIcon } from "../icons";

// Funil: 3 barras (Elaboração/Revisão/Protocolado) — os 3 estágios de PRODUÇÃO
// da peça, todos "ativos" por definição (Protocolado é o fim natural do
// pipeline, não uma exclusão). Sem "gargalo" (não se aplica a 3 estágios fixos
// de tarefa). Somente leitura, como o Board.
export function Funil({
  pipeline,
}: {
  pipeline: ReturnType<typeof usePrazosPipeline>;
}) {
  if (pipeline.isError) {
    return (
      <div className="text-destructive flex flex-1 items-center justify-center text-[12.5px]">
        Não foi possível carregar o pipeline. Tente novamente.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-10 pt-[30px] pb-10">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[13px] font-medium">Pipeline de peças</span>
          <span className="text-fg3 text-[12px]">{pipeline.total} ativos</span>
        </div>
        <p className="text-fg3 mb-[22px] text-[12.5px] leading-[1.5]">
          Onde o volume está parado. A largura da barra é relativa à maior
          etapa.
        </p>
        {pipeline.isLoading
          ? [0, 1, 2].map((i) => <BarSkeleton key={i} />)
          : pipeline.funil.map((e) => (
              <div key={e.key} className="rounded-lg px-2 py-2.5">
                <div className="flex items-center gap-2.5">
                  <StatusIcon k={e.iconKey} size={16} />
                  <span className="text-[13px] font-medium">{e.label}</span>
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

function BarSkeleton() {
  return (
    <div className="px-2 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="bg-hover size-4 animate-pulse rounded-full" />
        <span className="bg-hover h-3.5 w-32 animate-pulse rounded" />
      </div>
      <div className="bg-hover mt-[7px] h-3 animate-pulse overflow-hidden rounded" />
    </div>
  );
}
