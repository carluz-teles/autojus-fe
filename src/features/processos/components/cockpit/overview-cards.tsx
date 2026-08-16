"use client";

import { Clock, FileText, Gavel, ListChecks } from "lucide-react";

import { KpiCard, type KpiTone } from "@/components/ui/kpi-card";
import type { PrazoView } from "@/features/prazos/types";
import { formatDate } from "@/lib/format";

// Cards de visão geral (§8): próximo prazo, intimações, tarefas, peças
// (placeholder). As contagens já vêm derivadas do hook do cockpit; aqui é só
// mapeamento para o DS (KpiCard). Só JSX + binding.

function prazoTone(p: PrazoView): KpiTone {
  if (p.days_left < 0) return "destructive";
  if (p.days_left <= 3) return "gold";
  return "default";
}

function prazoValue(p: PrazoView): string {
  if (p.days_left === 0) return "Hoje";
  const abs = Math.abs(p.days_left);
  return p.days_left < 0 ? `${abs}d atraso` : `${abs} dias`;
}

export function OverviewCards({
  proximoPrazo,
  counts,
}: {
  proximoPrazo: PrazoView | null;
  counts: {
    intimacoesTotal: number;
    intimacoesPendentes: number;
    tasksAbertas: number;
    tasksAtrasadas: number;
  };
}) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        icon={Clock}
        label="Próximo prazo"
        tone={proximoPrazo ? prazoTone(proximoPrazo) : "muted"}
        value={proximoPrazo ? prazoValue(proximoPrazo) : "—"}
        sublabel={
          proximoPrazo
            ? `Vence em ${formatDate(proximoPrazo.end_date)}`
            : "Nenhum prazo em aberto"
        }
      />

      <KpiCard
        icon={Gavel}
        label="Intimações"
        tone={counts.intimacoesPendentes > 0 ? "gold" : "default"}
        value={String(counts.intimacoesTotal)}
        sublabel={
          counts.intimacoesPendentes > 0
            ? `${counts.intimacoesPendentes} pendente(s) de análise`
            : "Todas analisadas"
        }
      />

      <KpiCard
        icon={ListChecks}
        label="Tarefas"
        tone={counts.tasksAtrasadas > 0 ? "destructive" : "default"}
        value={String(counts.tasksAbertas)}
        sublabel={
          counts.tasksAtrasadas > 0
            ? `${counts.tasksAtrasadas} atrasada(s)`
            : "Nenhuma atrasada"
        }
      />

      <KpiCard
        icon={FileText}
        label="Peças"
        tone="muted"
        value="—"
        sublabel="Geração de peças chega na Fase 2"
      />
    </section>
  );
}
