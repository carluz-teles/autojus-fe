"use client";

import { FilePlus2, Lock, MoreHorizontal, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge, type RiskLevel } from "@/components/ui/risk-badge";
import { formatClaimValueBRL, formatDate } from "@/lib/format";

import { degreeLabel, lifecycleLabel, secrecyLabel } from "../../lib/labels";
import type { ProcessoView } from "../../types";

// Cabeçalho do cockpit (§6): breadcrumb, CNJ herói + badge de situação, linha de
// classificação e a grade de metadata (distribuição, valor da causa, grau,
// sistema). O slot "Responsável" mora no card dedicado em partes-cards.tsx.
// Ações de IA/tarefa como placeholders no-op. Só JSX + binding.
export function CockpitHeader({
  processo,
  riskLevel,
}: {
  processo: ProcessoView;
  riskLevel: RiskLevel;
}) {
  const breadcrumb = useMemo(
    () => [
      { label: "Processos", href: "/processos" },
      { label: processo.cnj_number },
    ],
    [processo.cnj_number],
  );
  useSetBreadcrumb(breadcrumb);

  return (
    <header className="reveal flex flex-col gap-5 border-b pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl leading-none tracking-tight tabular-nums">
              {processo.cnj_number}
            </h1>
            <Badge variant="secondary">
              {lifecycleLabel(processo.lifecycle)}
            </Badge>
            <RiskBadge level={riskLevel} />
            {processo.secrecy !== "PUBLIC" ? (
              <Badge variant="outline">
                <Lock />
                {secrecyLabel(processo.secrecy)}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {[
              processo.class,
              processo.subject,
              processo.court,
              degreeLabel(processo.degree),
              processo.judging_body,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" disabled>
            <Sparkles data-icon="inline-start" /> Gerar peça com IA
          </Button>
          <Button size="sm" variant="outline" disabled>
            <FilePlus2 data-icon="inline-start" /> Nova tarefa
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled
            aria-label="Mais ações"
          >
            <MoreHorizontal />
          </Button>
        </div>
      </div>

      <dl className="flex flex-wrap items-baseline gap-y-2">
        <MetaField label="Distribuição">
          {formatDate(processo.filed_at)}
        </MetaField>
        <MetaField label="Valor da causa">
          {formatClaimValueBRL(processo.claim_value)}
        </MetaField>
        <MetaField label="Grau">{degreeLabel(processo.degree)}</MetaField>
        <MetaField label="Sistema">{processo.court || "—"}</MetaField>
      </dl>
    </header>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="not-first:before:text-muted-foreground/40 inline-flex flex-wrap items-baseline gap-x-1.5 not-first:before:mr-2.5 not-first:before:content-['·'] not-first:before:select-none">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}
