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

import { FASE_STEPS } from "../lib/apresentacao";
import type { ProcessoPhase, ProximoPasso, ProximoPassoKind } from "../types";

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

// Posição da fase na régua determinística (Conhecimento→Execução). -1 quando
// a fase é null/desconhecida (o cabeçalho de fase é omitido nesse caso).
function faseInfo(phase: ProcessoPhase | null | undefined) {
  if (!phase) return null;
  const idx = FASE_STEPS.findIndex((s) => s.key === phase);
  if (idx < 0) return null;
  return {
    ordinal: idx + 1,
    total: FASE_STEPS.length,
    label: FASE_STEPS[idx].label,
  };
}

interface Props {
  passo: ProximoPasso;
  /** Fase processual atual (derivada no BE); mostra o "onde está" acima do passo. */
  phase?: ProcessoPhase | null;
  /** Ação opcional — leva ao trabalho do processo (prazos/providências). */
  onConferir?: () => void;
}

/**
 * Card "Próximo passo sugerido" no topo do cockpit. Liga o ONDE ESTÁ (fase
 * processual derivada) ao O QUE FAZER (próximo passo). Renderizado só quando o
 * BE devolve `proximo_passo` não-null (motor determinístico). Sem sugestão → o
 * chamador não monta este componente.
 */
export function ProximoPassoCard({ passo, phase, onConferir }: Props) {
  const { icon: Icon, kicker } = META[passo.kind];
  const urgent = isUrgent(passo);
  const fase = faseInfo(phase);
  const tone = urgent
    ? "border-destructive/25 bg-destructive/5"
    : "border-primary/20 bg-primary/5";
  const iconTone = urgent
    ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";

  return (
    <section
      aria-label="Próximo passo sugerido"
      className={`flex flex-col gap-3 rounded-xl border px-5 py-4 shadow-sm ${tone}`}
    >
      {fase ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-2.5">
          <p className="text-sm font-medium">
            <span className="text-muted-foreground font-normal">
              Fase {fase.ordinal} de {fase.total} ·{" "}
            </span>
            {fase.label}
          </p>
          <div
            className="flex items-center gap-1"
            role="img"
            aria-label={`Fase ${fase.ordinal} de ${fase.total}: ${fase.label}`}
          >
            {FASE_STEPS.map((s, i) => (
              <span
                key={s.key}
                className={`size-1.5 rounded-full ${
                  i < fase.ordinal ? "bg-primary" : "bg-muted-foreground/25"
                }`}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex gap-3">
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
      </div>
    </section>
  );
}
