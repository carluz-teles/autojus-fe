"use client";

import { Columns3, Inbox, LayoutGrid, ListFilter, Rows3 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { usePrazosContagem } from "../hooks/use-prazos-inbox";
import { usePrazosPipeline } from "../hooks/use-prazos-pipeline";
import { InboxView } from "./inbox/inbox-view";
import { PipelineView } from "./pipeline/pipeline-view";

export type PrazosVista = "inbox" | "pipeline";
export type PipeModo = "board" | "funil";

// Raiz das vistas de prazo (casca "Linear"). A vista (Inbox / Pipeline) é
// escolhida pelo NAV (rotas /prazos e /prazos/pipeline) — não por tab do topo,
// e cada rota monta uma instância própria de PrazosView (vista é fixa pro
// tempo de vida do componente). Por isso cada vista delega pra uma rota
// dedicada que chama SÓ o hook de dado que ela precisa — evita chamar
// usePrazosPipeline() (GET /v1/tasks real) sem necessidade na Inbox, e
// evita hook condicional (react-hooks/rules-of-hooks) aqui na raiz.
export function PrazosView({ vista = "inbox" }: { vista?: PrazosVista }) {
  return vista === "inbox" ? <PrazosInboxRoute /> : <PrazosPipelineRoute />;
}

// Inbox: contador ainda vem do mock (usePrazosContagem) — fora do escopo
// desta fatia (só Pipeline foi migrado pro dado real).
function PrazosInboxRoute() {
  const contagem = usePrazosContagem();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <TopBar
        vista="inbox"
        contagem={contagem.inbox.toLocaleString("pt-BR")}
        pipe="board"
        setPipe={() => {}}
      />
      <InboxView />
    </div>
  );
}

// Pipeline: UMA chamada de usePrazosPipeline() (GET /v1/tasks real),
// compartilhada entre o contador do header e o Board/Funil — nada de query
// duplicada.
function PrazosPipelineRoute() {
  const [pipe, setPipe] = useState<PipeModo>("board");
  const pipeline = usePrazosPipeline();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <TopBar
        vista="pipeline"
        contagem={pipeline.total}
        pipe={pipe}
        setPipe={setPipe}
      />
      <PipelineView modo={pipe} pipeline={pipeline} />
    </div>
  );
}

function TopBar({
  vista,
  contagem,
  pipe,
  setPipe,
}: {
  vista: PrazosVista;
  contagem: string;
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
      <span className="text-fg3 font-mono text-[11px]">{contagem}</span>
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
