"use client";

import {
  ChevronRight,
  FilePlus2,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskBadge, type RiskLevel } from "@/components/ui/risk-badge";
import { formatClaimValueBRL, formatDate } from "@/lib/format";

import {
  completenessPct,
  degreeLabel,
  lifecycleLabel,
  secrecyLabel,
} from "../../lib/labels";
import type { ProcessoView } from "../../types";
import { ResponsavelPicker } from "./responsavel-picker";

// Cabeçalho do cockpit (§6): breadcrumb, CNJ herói + badge de situação, linha de
// classificação, grade de metadata (distribuição, valor da causa, grau, sistema)
// e o slot "Responsável" — agora real (picker de membros → PUT /responsavel).
// Ações de IA/tarefa como placeholders no-op. Só JSX + binding.
export function CockpitHeader({
  processo,
  riskLevel,
}: {
  processo: ProcessoView;
  riskLevel: RiskLevel;
}) {
  const pct = completenessPct(processo.completeness);

  return (
    <header className="reveal flex flex-col gap-5 border-b pb-6">
      <nav
        aria-label="Trilha"
        className="text-muted-foreground flex items-center gap-1 text-sm"
      >
        <Link href="/processos" className="hover:text-foreground">
          Processos
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground/80 tabular-nums">
          {processo.cnj_number}
        </span>
      </nav>

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
          </div>
          <p className="text-muted-foreground text-sm">
            {[
              processo.class,
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

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetaField label="Distribuição">
          {formatDate(processo.filed_at)}
        </MetaField>
        <MetaField label="Valor da causa">
          {formatClaimValueBRL(processo.claim_value)}
        </MetaField>
        <MetaField label="Grau">{degreeLabel(processo.degree)}</MetaField>
        <MetaField label="Sistema">{processo.court || "—"}</MetaField>
        <MetaField label="Responsável">
          <ResponsavelPicker
            processoId={processo.id}
            assignedUserId={processo.assigned_user_id}
            assignedUserName={processo.assigned_user_name}
          />
        </MetaField>
      </dl>

      <div className="flex flex-col gap-1.5">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Completude do processo</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="bg-muted h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-gold h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {processo.secrecy !== "PUBLIC" ? (
          <p className="text-muted-foreground mt-1 text-xs">
            Sigilo: {secrecyLabel(processo.secrecy)}
          </p>
        ) : null}
      </div>
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </dt>
      <dd className="text-sm font-medium tabular-nums">{children}</dd>
    </div>
  );
}
