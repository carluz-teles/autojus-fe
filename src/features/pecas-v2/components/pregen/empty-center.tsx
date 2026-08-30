"use client";

// Centro vazio da Construção (pré-geração): ícone + "Redigir {tipo} com IA" +
// copy sobre origem (intimação + N teses selecionadas) + CTA "Gerar minuta".

import { Sparkles } from "lucide-react";

interface Props {
  pieceTitle: string;
  selectedCount: number;
  onGerar: () => void;
  isGenerating: boolean;
}

export function EmptyCenter({
  pieceTitle,
  selectedCount,
  onGerar,
  isGenerating,
}: Props) {
  const tesesLabel = selectedCount === 1 ? "1 tese" : `${selectedCount} teses`;
  return (
    <div className="mx-auto mt-[12vh] max-w-[520px] px-6 text-center">
      <div className="border-line bg-panel text-primary mx-auto mb-4 grid size-[52px] place-items-center rounded-[14px] border">
        <Sparkles className="size-6" />
      </div>
      <h2 className="font-display m-0 mb-1.5 text-[22px] font-medium">
        Redigir {pieceTitle} com IA
      </h2>
      <p className="text-fg2 mx-auto mb-[18px] max-w-[400px] text-[13px] leading-[1.6]">
        A IA parte da intimação de origem e das{" "}
        <strong className="text-foreground font-medium">
          {tesesLabel} selecionadas
        </strong>{" "}
        ao lado. Você revisa e assina — a autoria é sua.
      </p>
      <button
        type="button"
        onClick={onGerar}
        disabled={isGenerating}
        className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-[9px] px-[18px] py-2.5 text-[13px] font-medium disabled:opacity-70"
      >
        <Sparkles className="size-[15px]" />
        {isGenerating ? "Gerando minuta…" : "Gerar minuta"}
      </button>
    </div>
  );
}
