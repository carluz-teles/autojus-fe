"use client";

import {
  Clock,
  FileText,
  Gavel,
  ListChecks,
  ScrollText,
  ShieldAlert,
} from "lucide-react";

import { KpiCard, type KpiTone } from "@/components/ui/kpi-card";
import type { PrazoView } from "@/features/prazos/types";
import { formatDate } from "@/lib/format";

import type { RiscoResult } from "../../lib/risco";
import type { ProcessoView } from "../../types";

// Cards de visão geral (§8): próximo prazo, último andamento, intimações,
// tarefas, peças (placeholder), riscos. As contagens já vêm derivadas do hook do
// cockpit; aqui é só mapeamento para o DS (KpiCard). Só JSX + binding.

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

const RISCO_TONE: Record<RiscoResult["level"], KpiTone> = {
  critico: "destructive",
  atencao: "gold",
  baixo: "default",
};

const RISCO_VALUE: Record<RiscoResult["level"], string> = {
  critico: "Crítico",
  atencao: "Atenção",
  baixo: "Sob controle",
};

export function OverviewCards({
  processo,
  proximoPrazo,
  risco,
  counts,
  processoId,
}: {
  processo: ProcessoView;
  proximoPrazo: PrazoView | null;
  risco: RiscoResult;
  counts: {
    intimacoesTotal: number;
    intimacoesPendentes: number;
    tasksAbertas: number;
    tasksAtrasadas: number;
  };
  processoId: string;
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
        icon={ScrollText}
        label="Último andamento"
        tone={processo.last_movement_text ? "default" : "muted"}
        value={
          processo.last_movement_at
            ? formatDate(processo.last_movement_at)
            : "—"
        }
        sublabel={processo.last_movement_text || "Nenhum andamento registrado"}
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

      <KpiCard
        icon={ShieldAlert}
        label="Riscos"
        tone={RISCO_TONE[risco.level]}
        value={RISCO_VALUE[risco.level]}
        sublabel={risco.reasons[0] ?? "Sem sinais de risco"}
        href={`/processos/${processoId}`}
      />
    </section>
  );
}
