"use client";

import { ArrowRight, CircleCheck, Compass, User } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ProvidenciaResult } from "../../lib/proxima-providencia";

// Bloco "Próxima providência" (§10): o prazo vivo mais próximo vira o "o que
// fazer a seguir" — motivo/origem (intimação), vencimento, responsável e ações
// (no-op nesta fase). Tudo já computado pelo helper; aqui só pinta.

const URGENCIA_TOM: Record<
  ProvidenciaResult["urgencia"],
  { ring: string; accent: string; rotulo: string }
> = {
  vencido: {
    ring: "border-destructive/30 bg-destructive/[0.04]",
    accent: "text-destructive",
    rotulo: "Vencido",
  },
  urgente: {
    ring: "border-gold/40 bg-gold/[0.05]",
    accent: "text-gold",
    rotulo: "Urgente",
  },
  proximo: {
    ring: "border-gold/30",
    accent: "text-gold",
    rotulo: "Próximo",
  },
  normal: { ring: "", accent: "text-foreground", rotulo: "Programado" },
};

function countdown(daysLeft: number): string {
  if (daysLeft === 0) return "Vence hoje";
  const abs = Math.abs(daysLeft);
  const dias = abs === 1 ? "dia" : "dias";
  return daysLeft < 0 ? `${abs} ${dias} em atraso` : `${abs} ${dias} restantes`;
}

export function ProximaProvidenciaCard({
  providencia,
}: {
  providencia: ProvidenciaResult | null;
}) {
  if (!providencia) {
    return (
      <div className="bg-card ring-foreground/10 flex items-center gap-3 rounded-xl p-5 shadow-sm ring-1">
        <span className="bg-muted/60 text-muted-foreground flex size-9 items-center justify-center rounded-full">
          <CircleCheck className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-medium">Nada urgente agora</h3>
          <p className="text-muted-foreground text-sm">
            Não há prazo em aberto exigindo providência.
          </p>
        </div>
      </div>
    );
  }

  const { prazo, task, intimationId, urgencia } = providencia;
  const tom = URGENCIA_TOM[urgencia];

  return (
    <div
      className={cn(
        "bg-card ring-foreground/10 flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1",
        tom.ring,
      )}
    >
      <div className="flex items-center gap-2">
        <Compass className={cn("size-4", tom.accent)} />
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Próxima providência
        </h3>
        <Badge variant="outline" className={tom.accent}>
          {tom.rotulo}
        </Badge>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium">{prazo.kind || "Prazo"}</p>
          <p
            className={cn(
              "font-display mt-1 text-2xl leading-none tabular-nums",
              tom.accent,
            )}
          >
            {countdown(prazo.days_left)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Vence em</p>
          <p className="text-sm font-medium tabular-nums">
            {formatDate(prazo.end_date)}
          </p>
        </div>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1">
          <User className="size-3.5" />
          {task ? "Tarefa atribuída" : "Sem responsável definido"}
        </span>
        {intimationId ? (
          <Link
            href={`/intimacoes/${intimationId}`}
            className="text-gold inline-flex items-center gap-1 hover:underline"
          >
            Ver intimação de origem <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button size="sm" variant="outline" disabled>
          Atribuir responsável
        </Button>
        <Button size="sm" disabled>
          Confirmar prazo
        </Button>
      </div>
    </div>
  );
}
