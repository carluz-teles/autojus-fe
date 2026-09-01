"use client";

import { AlertTriangle } from "lucide-react";

import { OrigemIcon, PrioIcon } from "../icons";
import type { InboxModel } from "./inbox-view";

// Painel direito da Inbox: o item em foco (peek) com urgência, origem, contagem
// regressiva, teor da intimação e o rodapé de despacho (Confirmar / Ajustar /
// Atribuir / Adiar) + dicas de teclado. Binding puro sobre inbox.foco.
export function PeekPane({ inbox }: { inbox: InboxModel }) {
  const f = inbox.foco;

  if (!f) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center">
        <p className="text-fg3 text-[13px]">
          {inbox.vazio ? "Nada em triagem." : "Selecione um item à esquerda."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-w-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-[30px] py-[26px]">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md py-[3px] pr-[9px] pl-[7px] text-[11.5px] font-medium"
            style={{ background: f.urgFundo, color: f.urgCor }}
          >
            <PrioIcon k={f.urgK} size={12} />
            {f.urgLabel}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-[9px] py-[3px] text-[11.5px] font-medium"
            style={{ background: f.origemFundo, color: f.origemCor }}
          >
            <OrigemIcon origem={f.origem} cor={f.origemCor} />
            {f.origemLabel}
          </span>
          <span className="text-primary ml-auto font-mono text-[11px]">
            {f.cnjCurto}
          </span>
        </div>

        <h1 className="mt-4 mb-1 text-[21px] leading-[1.2] font-semibold tracking-[-0.01em]">
          {f.providencia}
        </h1>
        <div className="text-fg3 text-[12.5px]">
          {f.cliente} · {f.orgao} ›
        </div>

        <div className="border-line mt-[22px] mb-5 flex items-baseline gap-3 border-b pb-5">
          <span
            className="text-[38px] leading-none font-semibold tabular-nums"
            style={{ color: f.urgCor }}
          >
            {f.faltamNum}
          </span>
          <span className="text-fg3 text-[12.5px] leading-[1.5]">
            {f.faltamFrase}
            <br />
            interno{" "}
            <strong className="text-foreground font-medium">
              {f.interna}
            </strong>{" "}
            · fatal{" "}
            <strong className="text-foreground font-medium">{f.fatal}</strong>
          </span>
        </div>

        <div className="text-fg3 text-[10.5px] font-medium tracking-[0.05em] uppercase">
          Intimação de origem
        </div>
        <p className="text-foreground mt-[9px] text-[13px] leading-[1.6]">
          {f.trecho ||
            "Publicação capturada do DJEN. Teor integral disponível nos autos do processo."}
        </p>
        <div className="text-fg3 mt-2.5 text-[11.5px]">
          Publicado {f.publicacao} · resp. {f.resp}
        </div>

        {f.temNota ? (
          <div
            className="mt-5 flex gap-2.5 rounded-lg border p-[12px_14px]"
            style={{
              background: "color-mix(in oklch, var(--gold) 6%, transparent)",
              borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)",
            }}
          >
            <AlertTriangle
              className="mt-px size-4 shrink-0"
              style={{ color: "var(--gold)" }}
              strokeWidth={1.8}
            />
            <span className="text-foreground text-[12px] leading-[1.5]">
              {f.nota}
            </span>
          </div>
        ) : null}

        {f.resolveAberto ? (
          <div
            className="mt-4 rounded-[10px] border p-3.5"
            style={{
              borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)",
              background: "color-mix(in oklch, var(--gold) 6%, transparent)",
            }}
          >
            <div className="mb-2.5 text-[12.5px] font-semibold">
              As duas fontes divergem. Qual vale?
            </div>
            <div className="flex gap-2">
              <button
                onClick={f.confirmar}
                className="border-line bg-panel text-foreground hover:bg-hover flex-1 rounded-lg border p-2.5 text-[12.5px] font-medium"
              >
                Manter declarado{" "}
                <span className="text-fg3 font-mono">04/09</span>
              </button>
              <button
                onClick={f.confirmar}
                className="border-line bg-panel text-foreground hover:bg-hover flex-1 rounded-lg border p-2.5 text-[12.5px] font-medium"
              >
                Manter calculado{" "}
                <span className="text-fg3 font-mono">08/09</span>
              </button>
            </div>
            <button
              onClick={f.fecharResolve}
              className="text-fg3 mt-2 p-1 text-[11.5px]"
            >
              Cancelar
            </button>
          </div>
        ) : null}
      </div>

      {/* despacho */}
      <div className="border-line bg-panel shrink-0 border-t px-4 py-[11px]">
        <div className="flex items-center gap-[7px]">
          <button
            onClick={f.confirmar}
            className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-[7px] px-[13px] py-2 text-[12.5px] font-medium"
          >
            {f.ehDivergente && !f.resolveAberto
              ? "Resolver divergência"
              : "Confirmar prazo"}
            <span className="rounded border border-white/25 bg-white/[0.18] px-1.5 py-0.5 font-mono text-[10px] leading-none text-white/80">
              C
            </span>
          </button>
          <DespachoBtn label="Ajustar" atalho="E" />
          <DespachoBtn label="Atribuir" atalho="A" />
          <DespachoBtn label="Adiar" atalho="S" className="ml-auto" />
        </div>
        <div className="text-fg3 mt-2.5 flex items-center gap-4 pl-0.5 text-[11px]">
          <Hint keys={["J", "K"]} label="navegar" />
          <Hint keys={["⏎"]} label="abrir processo" />
          <Hint keys={["⌘", "⏎"]} label="confirmar e próximo" />
        </div>
      </div>
    </div>
  );
}

function DespachoBtn({
  label,
  atalho,
  className,
}: {
  label: string;
  atalho: string;
  className?: string;
}) {
  return (
    <button
      className={`border-line bg-panel text-foreground hover:bg-hover inline-flex items-center gap-[7px] rounded-[7px] border px-[11px] py-2 text-[12.5px] ${className ?? ""}`}
    >
      {label}
      <span className="border-line bg-hover text-fg3 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none">
        {atalho}
      </span>
    </button>
  );
}

function Hint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys.map((k) => (
        <span
          key={k}
          className="border-line bg-hover text-fg3 rounded px-1.5 py-0.5 font-mono text-[10px] leading-none"
        >
          {k}
        </span>
      ))}
      {label}
    </span>
  );
}
