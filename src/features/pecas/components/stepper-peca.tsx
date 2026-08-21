"use client";

import { cn } from "@/lib/utils";

const PASSOS = ["Construção", "Assinatura", "Protocolo"] as const;

export type PassoPeca = 1 | 2 | 3;

export function StepperPeca({
  atual,
  onIr,
}: {
  atual: PassoPeca;
  onIr: (p: PassoPeca) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {PASSOS.map((label, i) => {
        const n = (i + 1) as PassoPeca;
        const ativo = n === atual;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onIr(n)}
            className={cn(
              "flex cursor-pointer items-center gap-2 text-[13px]",
              ativo ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border text-[11px] tabular-nums",
                ativo
                  ? "border-gold bg-[color-mix(in_oklch,var(--gold)_12%,transparent)]"
                  : "border-border",
              )}
            >
              {n}
            </span>
            {label}
            {i < PASSOS.length - 1 && (
              <span className="ml-1 h-px w-6.5 bg-border" />
            )}
          </button>
        );
      })}
    </div>
  );
}
