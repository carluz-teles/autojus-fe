"use client";

// Aba "Revisão" do painel lateral. Só aparece depois que o advogado assumiu
// autoria (edição manual). Análise proativa sob demanda: usuário clica
// "Revisar peça" → mock devolve N sugestões com categorias (CLAREZA,
// FUNDAMENTAÇÃO, COMPLETUDE, COERÊNCIA). Cada sugestão vira 1 card com o
// mesmo padrão do Ajuste proposto (Aplicar/Descartar por card + globais).

import { RotateCcw, Sparkles } from "lucide-react";

import type { PendingChange } from "../../types";
import { ChangeCard } from "./change-card";

interface Props {
  /** null = ainda não rodou; [] = rodou e não encontrou nada. */
  suggestions: PendingChange[] | null;
  loading: boolean;
  onRun: () => void;
  onAcceptOne: (sectionId: string, index: number) => void;
  onDismissOne: (sectionId: string, index: number) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
}

export function TabRevisao({
  suggestions,
  loading,
  onRun,
  onAcceptOne,
  onDismissOne,
  onAcceptAll,
  onDismissAll,
}: Props) {
  const hasRun = suggestions !== null;
  const count = suggestions?.length ?? 0;

  if (loading) {
    return <LoadingState />;
  }

  if (!hasRun) {
    return <EmptyState onRun={onRun} />;
  }

  if (count === 0) {
    return <NoIssuesState onRun={onRun} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-1 flex items-baseline gap-2">
          <h3 className="font-display text-[15px]">Sugestões de revisão</h3>
        </div>
        <p className="text-muted-foreground text-[12.5px] leading-[1.5]">
          Passe o olho e decida cada uma.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[color-mix(in_oklch,var(--primary)_25%,transparent)] bg-[color-mix(in_oklch,var(--primary)_5%,transparent)] px-3 py-2">
          <span className="text-[12px] font-medium">
            {count} {count === 1 ? "sugestão" : "sugestões"}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onAcceptAll}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-1 text-[12px] font-medium transition-colors"
            >
              Aplicar todas
            </button>
            <button
              type="button"
              onClick={onDismissAll}
              className="border-border hover:bg-muted rounded-md border bg-transparent px-3 py-1 text-[12px] font-medium transition-colors"
            >
              Descartar todas
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {suggestions!.map((s, i) => (
            <ChangeCard
              key={`${s.sectionId}-${s.category}-${i}`}
              change={s}
              onAccept={() => onAcceptOne(s.sectionId, i)}
              onDismiss={() => onDismissOne(s.sectionId, i)}
            />
          ))}
        </div>
      </div>

      <div className="border-border border-t px-4 py-3">
        <button
          type="button"
          onClick={onRun}
          className="text-muted-foreground hover:text-foreground inline-flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-medium transition-colors"
        >
          <RotateCcw className="size-3" />
          Revisar de novo
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-3 grid size-10 place-items-center rounded-full"
        style={{
          background: "color-mix(in oklch, var(--gold) 15%, transparent)",
          color: "var(--gold)",
        }}
      >
        <Sparkles className="size-4" />
      </span>
      <h3 className="font-display mb-1 text-[15px]">Revisão da peça</h3>
      <p className="text-muted-foreground mb-4 text-[12.5px] leading-[1.5]">
        Passagem por clareza, fundamentação, completude e coerência. Nada muda
        na peça até você aplicar.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
      >
        Revisar peça
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <span
        className="mb-3 grid size-10 place-items-center rounded-full"
        style={{
          background: "color-mix(in oklch, var(--gold) 15%, transparent)",
          color: "var(--gold)",
        }}
      >
        <Sparkles className="size-4 animate-pulse" />
      </span>
      <p className="text-muted-foreground text-[13px]">Analisando a peça…</p>
    </div>
  );
}

function NoIssuesState({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h3 className="font-display mb-1 text-[15px]">Sem sugestões</h3>
      <p className="text-muted-foreground mb-4 text-[12.5px] leading-[1.5]">
        A peça passou pela análise sem apontamentos. Edite à vontade e revise
        de novo quando quiser.
      </p>
      <button
        type="button"
        onClick={onRun}
        className="border-border hover:bg-muted inline-flex items-center gap-1.5 rounded-md border bg-transparent px-3 py-1.5 text-[12px] font-medium transition-colors"
      >
        <RotateCcw className="size-3" />
        Revisar de novo
      </button>
    </div>
  );
}
