"use client";

// Barra contextual da tela de Construção (pré-geração): voltar, tipo da peça +
// chip "Vazia" + CNJ curto; à direita Salvar / Enviar p/ revisão / Protocolar.
// Neste milestone só "Gerar minuta" (no centro) funciona — as ações da barra
// ficam desabilitadas (TODO: ligar nos milestones de assinatura/protocolo).

import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  cnjShort: string;
  onBack: () => void;
}

export function TopBar({ title, cnjShort, onBack }: Props) {
  return (
    <div className="border-line flex flex-none items-center gap-3 border-b px-5 py-[11px]">
      <button
        type="button"
        onClick={onBack}
        className="text-fg2 hover:bg-hover -ml-[9px] inline-flex items-center gap-1.5 rounded-md px-[9px] py-[5px] text-xs"
      >
        <ChevronLeft className="size-[13px]" />
        Voltar · início
      </button>

      <span className="text-[13px] font-medium">{title}</span>
      <span className="bg-hover text-fg2 rounded-full px-[9px] py-0.5 text-[11px] font-medium">
        Vazia
      </span>
      <span className="text-fg3 font-mono text-[11px]">{cnjShort}</span>

      <div className="ml-auto flex gap-2">
        <BarButton label="Salvar" />
        <BarButton label="Enviar p/ revisão" />
        <BarButton label="Protocolar" primary />
      </div>
    </div>
  );
}

// TODO: ligar estas ações nos próximos milestones (salvar/enviar/protocolar).
// Antes da geração a peça está vazia, então ficam desabilitadas (no-op).
function BarButton({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <button
      type="button"
      disabled
      title="Disponível após gerar a minuta"
      className={
        primary
          ? "bg-primary text-primary-foreground cursor-not-allowed rounded-[7px] px-[13px] py-[7px] text-xs font-medium opacity-60"
          : "border-line bg-panel text-foreground cursor-not-allowed rounded-[7px] border px-3 py-[7px] text-xs opacity-60"
      }
    >
      {label}
    </button>
  );
}
