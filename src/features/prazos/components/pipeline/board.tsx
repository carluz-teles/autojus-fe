"use client";

import { GripHorizontal } from "lucide-react";

import type {
  BoardCard,
  usePrazosPipeline,
} from "../../hooks/use-prazos-pipeline";
import { OrigemIcon, PrioIcon, StatusIcon } from "../icons";

// Board = quadro de trabalho por estágio. Arrastar cards entre colunas (HTML5 DnD
// nativo, como no mockup) dispara a governança de movimento no hook. Componente =
// JSX + binding.
export function Board({
  pipeline,
}: {
  pipeline: ReturnType<typeof usePrazosPipeline>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-line2 bg-sidebar text-fg3 flex shrink-0 items-center gap-2 border-b px-4 py-[7px] text-[11.5px]">
        <GripHorizontal className="size-3.5" strokeWidth={1.9} />
        <span>
          {pipeline.arrastando
            ? "Solte numa coluna para mover — pulos de etapa são bloqueados."
            : "Arraste um card para avançar uma etapa. A governança valida o movimento."}
        </span>
      </div>
      <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        {pipeline.colunas.map((c) => (
          <div
            key={c.key}
            onDragOver={c.onDragOver}
            onDrop={c.onDrop}
            className="border-line2 flex w-[264px] shrink-0 flex-col border-r transition-colors"
            style={{
              background: c.isDropTarget
                ? "color-mix(in oklch, var(--primary) 6%, transparent)"
                : undefined,
              boxShadow: c.isDropTarget
                ? "inset 0 0 0 2px color-mix(in oklch, var(--primary) 40%, transparent)"
                : undefined,
            }}
          >
            <div className="flex shrink-0 items-center gap-2 px-3.5 pt-[11px] pb-2.5">
              <StatusIcon k={c.key} size={14} />
              <span className="text-[12.5px] font-medium">{c.label}</span>
              <span className="text-fg3 font-mono text-[11px]">{c.n}</span>
            </div>
            <div className="flex flex-1 flex-col gap-[7px] overflow-y-auto px-2 pt-1 pb-3">
              {c.cards.map((k) => (
                <Card key={k.id} card={k} />
              ))}
              {c.temExtra ? (
                <div className="text-fg3 px-1 py-2 text-center text-[11px]">
                  +{c.extra} mais nesta etapa
                </div>
              ) : null}
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

function Card({ card }: { card: BoardCard }) {
  return (
    <div
      draggable
      onDragStart={card.onDragStart}
      onDragEnd={card.onDragEnd}
      className="border-line bg-panel hover:border-primary/30 cursor-grab rounded-lg border p-[10px_11px] transition-shadow hover:shadow-[0_2px_8px_oklch(0.27_0.012_200_/_8%)]"
      style={{ opacity: card.dragging ? 0.5 : 1 }}
    >
      <div className="flex items-center gap-[7px]">
        <PrioIcon k={card.urgK} size={13} />
        <span className="text-fg3 font-mono text-[10px]">{card.cnjCurto}</span>
        {card.temFlag ? (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full px-[7px] py-0.5 text-[9.5px] font-medium"
            style={{ background: card.flagFundo, color: card.flagCor }}
          >
            {card.flag}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-[13px] leading-[1.3] font-medium">
        {card.providencia}
      </div>
      <div className="text-fg3 mt-0.5 truncate text-[11.5px]">
        {card.cliente}
      </div>
      <div className="mt-[11px] flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px]"
          style={{ color: card.urgCor, background: card.urgFundo }}
        >
          {card.prazoCurto}
        </span>
        <OrigemIcon origem={card.origem} cor={card.origemCor} size={12} />
        <span
          className="border-line text-fg3 ml-auto grid size-5 place-items-center rounded-full border text-[8.5px]"
          title={card.resp}
        >
          {card.respIniciais}
        </span>
      </div>
    </div>
  );
}
