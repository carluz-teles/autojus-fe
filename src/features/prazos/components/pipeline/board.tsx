"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import type { usePrazosPipeline } from "../../hooks/use-prazos-pipeline";
import type { PipelineCard } from "../../lib/pipeline";
import { PrioIcon, StatusIcon } from "../icons";

// Board = quadro de trabalho por estágio de PRODUÇÃO da peça (Elaboração/
// Revisão/Protocolado), ligado a TAREFAS reais. SOMENTE LEITURA: pipeline_stage
// é projeção pura do BE (sem campo gravável) — sem drag, mesmo que a referência
// visual mostre cards arrastáveis (decisão de produto travada). O card é um
// <Link> real pra /tarefas/:id (foco de teclado nativo, Enter ativa).
export function Board({
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {pipeline.isLoading
          ? [0, 1, 2].map((i) => <ColumnSkeleton key={i} />)
          : pipeline.colunas.map((c) => (
              <div
                key={c.key}
                className="border-line2 flex w-[264px] shrink-0 flex-col border-r"
              >
                <div className="flex shrink-0 items-center gap-2 px-3.5 pt-[11px] pb-2.5">
                  <StatusIcon k={c.iconKey} size={14} />
                  <span className="text-[12.5px] font-medium">{c.label}</span>
                  <span className="text-fg3 font-mono text-[11px]">{c.n}</span>
                </div>
                <div className="flex flex-1 flex-col gap-[7px] overflow-y-auto px-2 pt-1 pb-3">
                  {c.cards.map((card) => (
                    <Card key={card.id} card={card} />
                  ))}
                  {c.vazia ? (
                    <div className="text-fg3/65 px-2 py-4 text-center text-[11px]">
                      Vazio
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="border-line2 flex w-[264px] shrink-0 flex-col border-r">
      <div className="flex shrink-0 items-center gap-2 px-3.5 pt-[11px] pb-2.5">
        <span className="bg-hover size-3.5 animate-pulse rounded-full" />
        <span className="bg-hover h-3.5 w-24 animate-pulse rounded" />
      </div>
      <div className="flex flex-1 flex-col gap-[7px] overflow-y-auto px-2 pt-1 pb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-line bg-panel rounded-lg border p-[10px_11px]"
          >
            <span className="bg-hover block h-3 w-16 animate-pulse rounded" />
            <span className="bg-hover mt-2 block h-3.5 w-full animate-pulse rounded" />
            <span className="bg-hover mt-[11px] block h-4 w-14 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Card({ card }: { card: PipelineCard }) {
  return (
    <div className="border-line bg-panel hover:border-primary/30 relative rounded-lg border p-[10px_11px] transition-shadow hover:shadow-[0_2px_8px_oklch(0.27_0.012_200_/_8%)]">
      <Link
        href={card.href}
        aria-label={card.ariaLabel}
        className="focus-visible:ring-ring absolute inset-0 z-0 rounded-lg focus-visible:ring-2 focus-visible:outline-none"
      />
      <div className="pointer-events-none relative z-[1] flex items-center gap-[7px]">
        <PrioIcon k={card.urgK} size={13} />
        {card.cnjCurto ? (
          <span className="text-fg3 font-mono text-[10px]">
            {card.cnjCurto}
          </span>
        ) : null}
      </div>
      <div className="pointer-events-none relative z-[1] mt-2 text-[13px] leading-[1.3] font-medium">
        {card.providencia}
      </div>
      {card.court ? (
        <div className="text-fg3 pointer-events-none relative z-[1] mt-0.5 truncate text-[11.5px]">
          {card.court}
        </div>
      ) : null}
      {card.temOrigem ? (
        <Link
          href={card.origemHref}
          aria-label={card.origemAriaLabel}
          className="bg-hover text-fg3 hover:text-primary relative z-[2] mt-2 inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[9.5px] font-medium no-underline"
        >
          <ArrowUpRight className="size-2.5" strokeWidth={2.2} />
          ver intimação
        </Link>
      ) : null}
      <div className="pointer-events-none relative z-[1] mt-[11px] flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px]"
          style={{ color: card.urgCor, background: card.urgFundo }}
        >
          {card.prazoLabel}
        </span>
        <span
          className="border-line text-fg3 ml-auto grid size-5 place-items-center rounded-full border text-[8.5px]"
          title={card.respLabel}
        >
          {card.respIniciais}
        </span>
      </div>
    </div>
  );
}
