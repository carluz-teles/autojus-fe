"use client";

import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Gavel,
  Loader2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type {
  Reconciliation,
  ReconciliationStatus,
  ReconciliationsView,
} from "../types";

// Aba Reconciliações: a resposta permanente a "o que o sistema fez com meus
// dados?". Em cima, o estado da importação corrente (backfill_job); embaixo, um
// card-"reconciliação" por importação — processos e intimações que trouxe, a janela
// de prazo geral e o desfecho. O detalhamento por janela abre na tela dedicada.

const fmtDay = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});
const fmtDayYear = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});
const fmtWhen = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtInt = new Intl.NumberFormat("pt-BR");

function windowLabel(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
    return `${from} – ${to}`;
  }
  // Mostra o ano também no início quando os anos diferem — senão "10/08 – 10/08/26"
  // parece o mesmo dia. Em janela do mesmo ano (semanal), o ano fica só no fim.
  const startFmt = f.getFullYear() !== t.getFullYear() ? fmtDayYear : fmtDay;
  return `${startFmt.format(f)} – ${fmtDayYear.format(t)}`;
}

const STATUS_META: Record<
  ReconciliationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  COMPLETED: {
    label: "Concluída",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  PARTIAL: {
    label: "Parcial",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
    icon: CircleAlert,
  },
  RUNNING: {
    label: "Importando",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-500",
    icon: Loader2,
  },
};

function ReconciliationStatusChip({
  status,
}: {
  status: ReconciliationStatus;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.RUNNING;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <Icon className={cn("size-3", status === "RUNNING" && "animate-spin")} />
      {meta.label}
    </span>
  );
}

// Resumo do topo: importação em andamento (barra de progresso das janelas) ou o
// desfecho da última (concluída / parcial / nenhuma).
function ImportSummary({ data }: { data: ReconciliationsView }) {
  const imp = data.import;
  const done = imp.slices_ok + imp.slices_error;
  const pct =
    imp.total_slices > 0 ? Math.round((done / imp.total_slices) * 100) : 0;

  if (imp.importing) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="size-4 animate-spin text-amber-600" />
              Importação em andamento
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {done} de {imp.total_slices} janelas · {pct}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={imp.total_slices}
            aria-label="Progresso da importação"
            className="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium tabular-nums">
              {fmtInt.format(data.totals.court_records)}
            </span>{" "}
            processos e{" "}
            <span className="text-foreground font-medium tabular-nums">
              {fmtInt.format(data.totals.intimations)}
            </span>{" "}
            intimações até agora
            {imp.slices_error > 0 ? (
              <span className="text-amber-700 dark:text-amber-500">
                {" "}
                · {imp.slices_error}{" "}
                {imp.slices_error === 1
                  ? "janela com erro"
                  : "janelas com erro"}
              </span>
            ) : null}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (imp.status === "NONE") {
    return (
      <p className="text-muted-foreground text-sm">
        Nenhuma importação realizada ainda — ative uma fonte para começar.
      </p>
    );
  }

  const partial = imp.status === "PARTIAL";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
        partial
          ? "border-amber-200/70 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
          : "border-emerald-200/70 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300",
      )}
    >
      {partial ? (
        <CircleAlert className="size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0" />
      )}
      <span className="font-medium">
        {partial
          ? `Última importação concluída com ${imp.slices_error} ${imp.slices_error === 1 ? "janela com erro" : "janelas com erro"}`
          : "Acervo em dia — última importação concluída"}
      </span>
      <span className="opacity-80">
        · {fmtInt.format(data.totals.court_records)} processos ·{" "}
        {fmtInt.format(data.totals.intimations)} intimações
      </span>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-display text-2xl leading-none tabular-nums">
        {fmtInt.format(value)}
      </p>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}

// O card-reconciliação de uma importação, clicável — abre a tela de detalhe.
function ReconciliationCard({ u }: { u: Reconciliation }) {
  return (
    <Link
      href={`/reconciliacoes/${u.id}`}
      aria-label={`Detalhe da importação ${u.source} de ${windowLabel(u.window_from, u.window_to)}`}
      className="focus-visible:ring-ring/50 group bg-card hover:border-gold/40 block rounded-xl border p-5 shadow-sm transition-colors outline-none focus-visible:ring-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{u.source}</Badge>
          <ReconciliationStatusChip status={u.status} />
        </div>
        <ChevronRight className="text-muted-foreground group-hover:text-gold size-4 shrink-0 transition-colors" />
      </div>

      <div className="mt-4 flex gap-8">
        <div className="flex items-center gap-2">
          <Gavel className="text-gold/70 size-4" />
          <Metric label="Processos" value={u.processos} />
        </div>
        <div className="flex items-center gap-2">
          <FileText className="text-gold/70 size-4" />
          <Metric label="Intimações" value={u.intimacoes} />
        </div>
      </div>

      <dl className="text-muted-foreground mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs">
        <div className="flex items-center gap-1.5">
          <dt>Janela</dt>
          <dd className="text-foreground tabular-nums">
            {windowLabel(u.window_from, u.window_to)}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt>Janelas</dt>
          <dd className="text-foreground tabular-nums">
            {u.slices_ok}/{u.total_slices}
            {u.slices_error > 0 ? (
              <span className="text-amber-700 dark:text-amber-500">
                {" "}
                · {u.slices_error} com erro
              </span>
            ) : null}
          </dd>
        </div>
        <div className="flex items-center gap-1.5">
          <dt>Início</dt>
          <dd className="text-foreground tabular-nums">
            {fmtWhen.format(new Date(u.started_at))}
          </dd>
        </div>
        {u.finished_at ? (
          <div className="flex items-center gap-1.5">
            <dt>Fim</dt>
            <dd className="text-foreground tabular-nums">
              {fmtWhen.format(new Date(u.finished_at))}
            </dd>
          </div>
        ) : null}
      </dl>
    </Link>
  );
}

export function ReconciliationsTab({
  data,
  isPending,
  isError,
}: {
  data?: ReconciliationsView;
  isPending: boolean;
  isError: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-muted/40 h-24 animate-pulse rounded-xl border" />
        <div className="bg-muted/40 h-40 animate-pulse rounded-xl border" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Não foi possível carregar as reconciliações. Tente novamente.
      </p>
    );
  }

  // Guard defensivo: ?? [] cobre uma resposta sem a chave (BE anterior).
  const recons = data.reconciliations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <ImportSummary data={data} />

      <h3 className="text-sm font-medium">
        Importações{" "}
        <span className="text-muted-foreground font-normal tabular-nums">
          ({fmtInt.format(recons.length)})
        </span>
      </h3>

      {recons.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border px-4 py-10 text-center text-sm">
          Nenhuma importação ainda.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recons.map((u) => (
            <ReconciliationCard key={u.id} u={u} />
          ))}
        </div>
      )}
    </div>
  );
}
