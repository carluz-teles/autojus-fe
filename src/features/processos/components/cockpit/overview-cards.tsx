"use client";

import { ShieldAlert } from "lucide-react";

import { KpiCard, type KpiTone } from "@/components/ui/kpi-card";

import type { RiscoResult } from "../../lib/risco";

// Cards de visão geral (§8): hoje só o card de Riscos — os demais indicadores
// (próximo prazo, último andamento, intimações, tarefas, peças) saíram daqui:
// prazo crítico já aparece na AlertBar, os demais viraram abas com badge de
// contagem ou a seção "Último andamento" no Resumo. Só JSX + binding.

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
  risco,
  processoId,
}: {
  risco: RiscoResult;
  processoId: string;
}) {
  return (
    <section>
      <KpiCard
        className="max-w-xs"
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
