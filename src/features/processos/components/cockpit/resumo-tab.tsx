"use client";

import { FileText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { IAPanel } from "@/components/ui/ia-panel";
import { RiskBadge } from "@/components/ui/risk-badge";

import type { ProvidenciaResult } from "../../lib/proxima-providencia";
import type { RiscoResult } from "../../lib/risco";
import { ProximaProvidenciaCard } from "./proxima-providencia-card";
import { ResumoIAPanel } from "./resumo-ia-panel";

// Aba "Resumo" (fiel ao design LEXIA): coluna esquerda com o "Resumo por IA"
// (REAL, consome GET /v1/processos/:id/resume), a "Próxima providência"
// DETERMINÍSTICA (real), o bloco de risco (real) e "Documentos relevantes"
// (placeholder Fase 2); coluna direita só com o "Assistente IA" (casca
// IAPanel, Fase 3) — os dados do processo (Grau/Distribuição/Valor da
// causa/Órgão julgador) já aparecem no header, sem duplicar aqui. O resumo
// por IA é best-effort — o componente trata loading/erro/degrade, o resto da
// aba segue renderizando.
export function ResumoTab({
  processoId,
  providencia,
  risco,
}: {
  processoId: string;
  providencia: ProvidenciaResult | null;
  risco: RiscoResult;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <ResumoIAPanel processoId={processoId} />

        <ProximaProvidenciaCard providencia={providencia} />

        <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Avaliação de risco
            </h3>
            <RiskBadge level={risco.level} />
          </div>
          <ul className="flex flex-col gap-1.5">
            {risco.reasons.map((r) => (
              <li
                key={r}
                className="text-foreground/80 flex items-start gap-2 text-sm"
              >
                <span className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
                {r}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Cálculo determinístico (prazos, tarefas e intimações). A avaliação
            por IA chega na Fase 3.
          </p>
        </div>

        <EmptyState
          icon={FileText}
          title="Documentos relevantes"
          description="Os documentos e peças do processo mais relevantes para a próxima providência, destacados automaticamente."
          phase="Chega na Fase 2"
        />
      </div>

      <div className="flex flex-col gap-6">
        <IAPanel
          title="Assistente IA"
          placeholder="Pergunte sobre o processo e gere peças em contexto direto por aqui. Chega na Fase 3."
        />
      </div>
    </div>
  );
}
