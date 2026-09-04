"use client";

// Barra contextual da tela de Construção (pré-geração): voltar, tipo da peça +
// chip "Vazia" + CNJ curto; à direita Salvar / Protocolar.
// "Salvar" faz o flush explícito do autosave quando a peça está pronta.
// "Protocolar" é placeholder — o protocolo automático (e-SAJ) é uma vertical
// separada, ainda a construir.

import { ChevronLeft } from "lucide-react";

interface Props {
  title: string;
  cnjShort: string;
  onBack: () => void;
  /** Dispara o flush do autosave (só quando `podeSalvar`). */
  onSalvar?: () => void;
  /** Save em andamento — vira o rótulo pra "Salvando…". */
  salvando?: boolean;
  /** Habilita o "Salvar" (peça já gerada/pronta). */
  podeSalvar?: boolean;
}

export function TopBar({
  title,
  cnjShort,
  onBack,
  onSalvar,
  salvando,
  podeSalvar,
}: Props) {
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
        <BarButton
          label={salvando ? "Salvando…" : "Salvar"}
          onClick={onSalvar}
          disabled={!podeSalvar || salvando}
          disabledTitle="Disponível após gerar a minuta"
        />
        <BarButton
          label="Protocolar"
          primary
          disabled
          disabledTitle="Em breve"
        />
      </div>
    </div>
  );
}

function BarButton({
  label,
  primary,
  onClick,
  disabled,
  disabledTitle,
}: {
  label: string;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledTitle : undefined}
      className={
        primary
          ? "bg-primary text-primary-foreground rounded-[7px] px-[13px] py-[7px] text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
          : "border-line bg-panel text-foreground hover:bg-hover disabled:hover:bg-panel rounded-[7px] border px-3 py-[7px] text-xs disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {label}
    </button>
  );
}
