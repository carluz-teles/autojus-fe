"use client";

// Banner âmbar que abre o editor quando a peça foi gerada automaticamente.
// "Refazer" abre o dialog de refazer do zero; "Assumir autoria" some com o
// banner (fluxo real será tratado em rodada dedicada — por ora, mock).

import { Sparkles } from "lucide-react";

interface Props {
  thesisCount: number;
  onRefazer: () => void;
  onAssumirAutoria: () => void;
}

export function EditorBanner({
  thesisCount,
  onRefazer,
  onAssumirAutoria,
}: Props) {
  return (
    <div
      className="mx-8 mt-4 flex items-center gap-3 rounded-lg border px-4 py-3"
      style={{
        borderColor: "color-mix(in oklch, var(--gold) 45%, transparent)",
        background: "color-mix(in oklch, var(--gold) 8%, transparent)",
      }}
    >
      <Sparkles className="size-4 shrink-0" style={{ color: "var(--gold)" }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Minuta redigida automaticamente</p>
        <p className="text-muted-foreground text-[12px]">
          A partir da intimação e de {thesisCount}{" "}
          {thesisCount === 1 ? "tese" : "teses"}. Revise antes de assinar — a
          autoria é sua.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRefazer}
          className="border-border hover:bg-muted rounded-md border bg-transparent px-3 py-1.5 text-[12px] font-medium transition-colors"
        >
          Refazer
        </button>
        <button
          type="button"
          onClick={onAssumirAutoria}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors"
        >
          Assumir autoria
        </button>
      </div>
    </div>
  );
}
