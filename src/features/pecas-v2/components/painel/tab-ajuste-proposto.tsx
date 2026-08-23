"use client";

// Modo "Ajuste proposto" do painel lateral. Substitui as tabs Iterar/Chat
// enquanto há uma iteração pendente. Cards por seção (ChangeCard compartilhado
// com a aba Revisão). Duas dimensões de ação: por card e globais.

import type { PreviewState } from "../../types";
import { ChangeCard } from "./change-card";

interface Props {
  preview: PreviewState;
  scopeLabel: string;
}

export function TabAjusteProposto({ preview, scopeLabel }: Props) {
  const count = preview.pending.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-display text-[15px]">Ajuste proposto</h3>
          <span className="text-muted-foreground text-[12px]">
            {preview.scopeLabel}
          </span>
        </div>
        <p className="text-muted-foreground text-[12.5px] leading-[1.5]">
          Revise antes de aplicar — nada muda na peça até você aplicar.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[color-mix(in_oklch,var(--primary)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-3 py-2">
          <span className="text-[12px] font-medium">
            {count} {count === 1 ? "seção ajustada" : "seções ajustadas"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={preview.onAcceptAll}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
            >
              Aplicar todos
            </button>
            <button
              type="button"
              onClick={preview.onDismissAll}
              className="border-border hover:bg-muted rounded-md border bg-transparent px-3 py-1 text-[12px] font-medium transition-colors"
            >
              Descartar todos
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {preview.pending.map((change) => (
            <ChangeCard
              key={change.sectionId}
              change={change}
              onAccept={() => preview.onAcceptOne(change.sectionId)}
              onDismiss={() => preview.onDismissOne(change.sectionId)}
            />
          ))}
        </div>
      </div>

      <div className="border-border border-t px-4 py-3">
        <p className="text-muted-foreground mb-1.5 text-[11px]">
          Ajustar:{" "}
          <span className="text-foreground font-medium">{scopeLabel}</span>
        </p>
        <div className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2 opacity-60">
          <span className="text-muted-foreground flex-1 text-[13px]">
            Resolva os cards acima para pedir outro ajuste
          </span>
        </div>
      </div>
    </div>
  );
}
