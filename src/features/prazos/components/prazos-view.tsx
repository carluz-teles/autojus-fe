"use client";

import { Columns3, Inbox, LayoutGrid, ListFilter, Rows3 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { usePrazosContagem } from "../hooks/use-prazos-inbox";
import { InboxView } from "./inbox/inbox-view";
import { PipelineView } from "./pipeline/pipeline-view";

export type PrazosVista = "inbox" | "pipeline";
export type PipeModo = "board" | "funil";

// Raiz das vistas de prazo (casca "Linear"). A vista (Inbox / Pipeline) é
// escolhida pelo NAV (rotas /prazos e /prazos/pipeline) — não por tab do topo.
// O topo mostra ícone + título + contador + (no Pipeline) o toggle Funil/Board
// + o botão Agrupar, fiel ao mockup.
export function PrazosView({ vista = "inbox" }: { vista?: PrazosVista }) {
  const [pipe, setPipe] = useState<PipeModo>("board");
  const contagem = usePrazosContagem();
  const n = vista === "inbox" ? contagem.inbox : contagem.pipeline;

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <TopBar vista={vista} n={n} pipe={pipe} setPipe={setPipe} />
      {vista === "inbox" ? <InboxView /> : <PipelineView modo={pipe} />}
    </div>
  );
}

function TopBar({
  vista,
  n,
  pipe,
  setPipe,
}: {
  vista: PrazosVista;
  n: number;
  pipe: PipeModo;
  setPipe: (p: PipeModo) => void;
}) {
  return (
    <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
      {vista === "inbox" ? (
        <Inbox className="text-fg2 size-4" strokeWidth={1.9} />
      ) : (
        <Columns3 className="text-fg2 size-4" strokeWidth={1.9} />
      )}
      <span className="text-[13px] font-medium">
        {vista === "inbox" ? "Inbox" : "Pipeline"}
      </span>
      <span className="text-fg3 font-mono text-[11px]">
        {n.toLocaleString("pt-BR")}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {vista === "pipeline" ? (
          <>
            <Seg
              icon={<ListFilter className="size-3.5" strokeWidth={1.9} />}
              label="Funil"
              active={pipe === "funil"}
              onClick={() => setPipe("funil")}
            />
            <Seg
              icon={<LayoutGrid className="size-3.5" strokeWidth={1.9} />}
              label="Board"
              active={pipe === "board"}
              onClick={() => setPipe("board")}
            />
            <span className="bg-line mx-1 h-[18px] w-px" />
          </>
        ) : null}
        <button className="navi text-fg2 hover:bg-hover flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px]">
          <Rows3 className="size-3.5" strokeWidth={1.9} />
          Agrupar
        </button>
      </div>
    </header>
  );
}

function Seg({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors",
        active
          ? "bg-hover text-foreground font-medium"
          : "text-fg2 hover:bg-hover",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
