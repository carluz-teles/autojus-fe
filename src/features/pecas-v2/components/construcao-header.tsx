"use client";

// Mini-header do fluxo de peticionamento (etapa 2): link "← Intimações",
// stepper (Construção · Assinatura · Protocolo) e CTA "Enviar para assinatura".
// O breadcrumb "Peticionamento › Processo XXX" é publicado no header do AppShell
// via useSetBreadcrumb (deixado ao componente pai).

import Link from "next/link";

import { cn } from "@/lib/utils";

const STEPS = ["Construção", "Assinatura", "Protocolo"] as const;
export type Step = 1 | 2 | 3;

interface Props {
  step: Step;
  onStepChange?: (s: Step) => void;
  /** URL do "voltar" (default: /intimacoes). */
  backHref?: string;
  onEnviar?: () => void;
  enviarDisabled?: boolean;
}

export function ConstrucaoHeader({
  step,
  onStepChange,
  backHref = "/intimacoes",
  onEnviar,
  enviarDisabled = true,
}: Props) {
  return (
    <div className="border-border flex items-center gap-6 border-b px-8 py-4">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground text-xs no-underline"
      >
        ← Intimações
      </Link>

      <Stepper current={step} onChange={onStepChange} />

      <div className="ml-auto">
        <button
          type="button"
          onClick={onEnviar}
          disabled={enviarDisabled}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          Enviar para assinatura
        </button>
      </div>
    </div>
  );
}

function Stepper({
  current,
  onChange,
}: {
  current: Step;
  onChange?: (s: Step) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === current;
        const isPast = n < current;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange?.(n)}
            disabled={!isPast && !active}
            className={cn(
              "flex items-center gap-2 text-[13px]",
              active
                ? "text-foreground cursor-default"
                : isPast
                  ? "text-foreground cursor-pointer"
                  : "text-muted-foreground cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border text-[11px] tabular-nums",
                active
                  ? "border-gold text-foreground bg-[color-mix(in_oklch,var(--gold)_12%,transparent)]"
                  : "border-border",
              )}
            >
              {n}
            </span>
            {label}
            {i < STEPS.length - 1 && (
              <span className="bg-border ml-1 h-px w-6.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
