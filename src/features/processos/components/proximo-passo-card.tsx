"use client";

import {
  ArrowRight,
  CalendarClock,
  Clock,
  Gavel,
  Landmark,
  ListChecks,
  type LucideIcon,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import type { ProximoPasso, ProximoPassoKind } from "../types";

const META: Record<ProximoPassoKind, { icon: LucideIcon; kicker: string }> = {
  CUMPRIR_PRAZO: { icon: Clock, kicker: "Cumprir prazo" },
  INICIAR_PROVIDENCIA: { icon: ListChecks, kicker: "Iniciar providência" },
  AVALIAR_SENTENCA: { icon: Gavel, kicker: "Avaliar sentença" },
  ACOMPANHAR_RECURSO: { icon: TrendingUp, kicker: "Acompanhar recurso" },
  ACOMPANHAR_EXECUCAO: { icon: Landmark, kicker: "Acompanhar execução" },
  PREPARAR_AUDIENCIA: { icon: CalendarClock, kicker: "Preparar audiência" },
};

// Um prazo que vence hoje, amanhã ou já venceu eleva o tom para "urgente"
// (destructive). O motor já escreve essa urgência no próprio label.
function isUrgent(passo: ProximoPasso): boolean {
  if (passo.kind !== "CUMPRIR_PRAZO") return false;
  return /vence hoje|vence amanhã|vencido/i.test(passo.label);
}

interface Props {
  passo: ProximoPasso;
  /** Ação opcional — leva ao trabalho do processo (prazos/providências). */
  onConferir?: () => void;
}

/**
 * Card "Próximo passo sugerido" no topo do cockpit. Renderizado só quando o BE
 * devolve `proximo_passo` não-null (motor determinístico). Sem sugestão → o
 * chamador não monta este componente.
 */
export function ProximoPassoCard({ passo, onConferir }: Props) {
  const { icon: Icon, kicker } = META[passo.kind];
  const urgent = isUrgent(passo);
  const tone = urgent
    ? "border-destructive/25 bg-destructive/5"
    : "border-primary/20 bg-primary/5";
  const iconTone = urgent
    ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";

  return (
    <section
      aria-label="Próximo passo sugerido"
      className={`flex gap-3 rounded-xl border px-5 py-4 shadow-sm ${tone}`}
    >
      <span
        aria-hidden
        className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconTone}`}
      >
        <Icon className="size-[18px]" strokeWidth={1.8} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {kicker}
        </p>
        <p className="font-display text-base leading-snug font-medium">
          {passo.label}
        </p>
        <p className="text-muted-foreground text-sm leading-relaxed">
          <span className="text-foreground font-medium">Por que: </span>
          {passo.rationale}
        </p>
        {onConferir ? (
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={onConferir}>
              Conferir
              <ArrowRight />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
