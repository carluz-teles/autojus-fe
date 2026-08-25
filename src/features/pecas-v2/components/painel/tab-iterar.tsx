"use client";

// Aba "Iterar" do painel lateral. Escopo (peça toda ou uma seção), ajustes
// rápidos e input livre. Rodapé mostra "Refazer rascunho do zero" APENAS
// quando o escopo é a peça toda.

import { RotateCcw } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef } from "react";

import type { Draft, IterateScope, QuickAdjustKind } from "../../types";
import { Chip } from "./chip";
import { ComposeInput } from "./compose-input";

const QUICK_ADJUSTS: { kind: QuickAdjustKind; label: string }[] = [
  { kind: "emphatic", label: "Mais enfático" },
  { kind: "concise", label: "Mais conciso" },
  { kind: "reinforce_thesis", label: "Reforçar a tese principal" },
  { kind: "add_grounds", label: "Adicionar fundamento" },
];

export interface TabIterarHandle {
  /** Foca o input (usado quando o usuário clica em "Refazer seção" no editor). */
  focusInput: () => void;
}

interface Props {
  draft: Draft;
  scope: IterateScope;
  onScopeChange: (s: IterateScope) => void;
  onSend: (instruction: string) => void;
  onQuickAdjust: (kind: QuickAdjustKind) => void;
  onRefazerDoZero: () => void;
  /** Loading = uma iteração está em curso. Chips e input ficam disabled. */
  loading?: boolean;
  /** Preview ativo = idem, bloqueado até o usuário aceitar/rejeitar. */
  previewActive?: boolean;
  /** Contador que reseta o input (após aceitar iteração). */
  resetKey?: number;
}

export const TabIterar = forwardRef<TabIterarHandle, Props>(function TabIterar(
  {
    draft,
    scope,
    onScopeChange,
    onSend,
    onQuickAdjust,
    onRefazerDoZero,
    loading = false,
    previewActive = false,
    resetKey = 0,
  },
  ref,
) {
  const inputHostRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      const ta = inputHostRef.current?.querySelector("textarea");
      ta?.focus();
    },
  }));

  const disabled = loading || previewActive;
  const isWhole = scope.kind === "whole";
  const activeSectionId = scope.kind === "section" ? scope.id : null;

  const scopeLabel = isWhole
    ? "Peça toda"
    : draft.sections.find((s) => s.id === activeSectionId)
      ? `${draft.sections.find((s) => s.id === activeSectionId)!.roman} — ${
          draft.sections.find((s) => s.id === activeSectionId)!.shortTitle
        }`
      : "Peça toda";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground text-[12.5px] leading-[1.5]">
          Peça ajustes ao rascunho — na peça toda ou numa seção. A reescrita é
          proposta e você aplica.
        </p>

        <p className="text-muted-foreground mt-5 text-[10.5px] tracking-[0.12em] uppercase">
          Onde aplicar
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip
            active={isWhole}
            disabled={disabled}
            onClick={() => onScopeChange({ kind: "whole" })}
          >
            Peça toda
          </Chip>
          {draft.sections.map((s) => (
            <Chip
              key={s.id}
              active={activeSectionId === s.id}
              disabled={disabled}
              onClick={() => onScopeChange({ kind: "section", id: s.id })}
            >
              {s.roman} — {s.shortTitle}
            </Chip>
          ))}
        </div>

        <p className="text-muted-foreground mt-5 text-[10.5px] tracking-[0.12em] uppercase">
          Ajustes rápidos
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {QUICK_ADJUSTS.map((q) => (
            <Chip
              key={q.kind}
              disabled={disabled}
              onClick={() => onQuickAdjust(q.kind)}
            >
              {q.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="border-border border-t px-4 py-3">
        <p className="text-muted-foreground mb-1.5 text-[11px]">
          Ajustar:{" "}
          <span className="text-foreground font-medium">{scopeLabel}</span>
        </p>
        <div ref={inputHostRef}>
          <ComposeInput
            placeholder="Ex.: reforce a ausência de contrato…"
            disabled={disabled}
            resetKey={resetKey}
            onSend={onSend}
          />
        </div>
        {isWhole && (
          <button
            type="button"
            onClick={onRefazerDoZero}
            disabled={disabled}
            className="text-muted-foreground hover:text-foreground mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="size-3" />
            Refazer rascunho do zero
          </button>
        )}
      </div>
    </div>
  );
});
