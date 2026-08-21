"use client";

import { Bell, Clock, FileText } from "lucide-react";
import { useState } from "react";

import { Kpi } from "@/components/mock-ui/data-display";
import { StatusBadge } from "@/components/mock-ui/status-badge";

import { useCaptures } from "../hooks/use-captures";
import type { CaptureRunView } from "../types";
import { CapturaDrawer } from "./captura-drawer";
import {
  fmtInt,
  fmtJanela,
  fmtQuando,
  kindLabel,
  statusTom,
} from "./capturas-formatters";

// ─── Filtro de ingestão (exclui ENRICHMENT) ───────────────────────────────────

function runsDeIngestao(runs: CaptureRunView[]): CaptureRunView[] {
  return runs.filter((r) => r.kind !== "ENRICHMENT");
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="bg-card ring-hairline rounded-xl p-4.5">
      <div className="bg-muted/40 h-3 w-24 animate-pulse rounded-md border" />
      <div className="bg-muted/40 mt-3 h-7 w-20 animate-pulse rounded-md border" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="border-border grid grid-cols-[minmax(0,1.6fr)_100px_100px_130px_120px] items-center gap-4 border-t py-3">
      <div className="bg-muted/40 h-4 w-36 animate-pulse rounded-md border" />
      <div className="bg-muted/40 h-4 w-16 animate-pulse rounded-md border" />
      <div className="bg-muted/40 h-4 w-16 animate-pulse rounded-md border" />
      <div className="bg-muted/40 h-4 w-20 animate-pulse rounded-md border" />
      <div className="bg-muted/40 h-5 w-24 animate-pulse rounded-full border" />
    </div>
  );
}

// ─── Header da tabela ────────────────────────────────────────────────────────

function TabelaHeader() {
  return (
    <div className="border-border grid grid-cols-[minmax(0,1.6fr)_100px_100px_130px_120px] items-center gap-4 border-b pb-2.5">
      {["JANELA", "PROCESSOS", "INTIMAÇÕES", "QUANDO", "ESTADO"].map((col) => (
        <span
          key={col}
          className="text-muted-foreground text-[10.5px] font-medium tracking-[0.08em] uppercase"
        >
          {col}
        </span>
      ))}
    </div>
  );
}

// ─── Linha da tabela ─────────────────────────────────────────────────────────

function RunRow({
  run,
  onClick,
}: {
  run: CaptureRunView;
  onClick: () => void;
}) {
  const tom = statusTom(run.display_status);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Detalhe da ingestão ${kindLabel(run.kind)} — janela ${fmtJanela(run.kind, run.window_from, run.window_to)} — ${run.display_status}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="border-border hover:bg-muted/30 focus-visible:ring-ring/50 grid cursor-pointer grid-cols-[minmax(0,1.6fr)_100px_100px_130px_120px] items-center gap-4 rounded-sm border-t py-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      {/* JANELA + sub-rótulo do tipo */}
      <div className="min-w-0">
        <span className="text-muted-foreground block tabular-nums">
          {fmtJanela(run.kind, run.window_from, run.window_to)}
        </span>
        <span className="text-muted-foreground/60 block text-[11.5px]">
          {kindLabel(run.kind)}
        </span>
      </div>

      {/* PROCESSOS */}
      <span className="text-muted-foreground tabular-nums">
        +{fmtInt.format(run.court_records_new)}
      </span>

      {/* INTIMAÇÕES */}
      <span className="text-muted-foreground tabular-nums">
        +{fmtInt.format(run.intimations_new)}
      </span>

      {/* QUANDO */}
      <span className="text-muted-foreground tabular-nums">
        {fmtQuando(run.finished_at)}
      </span>

      {/* ESTADO */}
      <StatusBadge tone={tom}>{run.display_status}</StatusBadge>
    </div>
  );
}

// ─── Tab principal ────────────────────────────────────────────────────────────

export function CapturasTab() {
  const { data, isPending, isError } = useCaptures();
  const [runSelecionada, setRunSelecionada] = useState<CaptureRunView | null>(
    null,
  );

  // Deriva runs de ingestão (sem ENRICHMENT) para KPIs e tabela
  const runs = data ? runsDeIngestao(data.runs) : [];

  const ultimaIngesta = runs.reduce<string | null>((acc, r) => {
    if (!r.finished_at) return acc;
    if (!acc) return r.finished_at;
    return r.finished_at > acc ? r.finished_at : acc;
  }, null);

  const totalProcessos = runs.reduce((acc, r) => acc + r.court_records_new, 0);
  const totalIntimacoes = runs.reduce((acc, r) => acc + r.intimations_new, 0);

  return (
    <div className="mt-7 flex max-w-5xl flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {isPending ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : isError || !data ? (
          <div className="col-span-3">
            <p role="alert" className="text-destructive text-sm">
              Não foi possível carregar as ingestões. Tente novamente.
            </p>
          </div>
        ) : (
          <>
            <Kpi
              rotulo="Última ingestão"
              valor={fmtQuando(ultimaIngesta)}
              icone={<Clock className="size-4" />}
            />
            <Kpi
              rotulo="Processos"
              valor={fmtInt.format(totalProcessos)}
              tom="info"
              icone={<FileText className="size-4" />}
            />
            <Kpi
              rotulo="Intimações"
              valor={fmtInt.format(totalIntimacoes)}
              icone={<Bell className="size-4" />}
            />
          </>
        )}
      </div>

      {/* Tabela */}
      {!isPending && !isError && data && (
        <div className="bg-card ring-hairline rounded-xl p-5">
          <TabelaHeader />

          {runs.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-[13.5px]">
              Nenhuma ingestão ainda.
            </p>
          ) : (
            runs.map((run) => (
              <RunRow
                key={run.id}
                run={run}
                onClick={() => setRunSelecionada(run)}
              />
            ))
          )}
        </div>
      )}

      {/* Skeleton tabela */}
      {isPending && (
        <div className="bg-card ring-hairline rounded-xl p-5">
          <TabelaHeader />
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      )}

      {/* Drawer */}
      <CapturaDrawer
        run={runSelecionada}
        onFechar={() => setRunSelecionada(null)}
      />
    </div>
  );
}
