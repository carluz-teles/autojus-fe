"use client";

import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";
import { Fragment, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type {
  ReconciliationRun,
  ReconciliationRunStatus,
  ReconciliationsView,
} from "../types";

// Aba Reconciliações: a resposta permanente a "o que o sistema fez com meus
// dados?". Progresso da importação em cima (backfill_job) e o histórico de
// execuções por janela embaixo (sync_run) — status, itens novos, dedupados e o
// erro de cada janela, com filtro "somente erros".

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
  return `${fmtDay.format(f)} – ${fmtDayYear.format(t)}`;
}

function StatusBadge({ status }: { status: ReconciliationRunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        status === "OK" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        status === "FAILED" && "bg-destructive/10 text-destructive",
        status === "RUNNING" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-500",
      )}
    >
      {status === "OK" ? (
        <CheckCircle2 className="size-3" />
      ) : status === "FAILED" ? (
        <CircleAlert className="size-3" />
      ) : (
        <Loader2 className="size-3 animate-spin" />
      )}
      {status === "OK" ? "OK" : status === "FAILED" ? "Erro" : "Rodando"}
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

export function ReconciliationsTab({
  data,
  isPending,
  isError,
}: {
  data?: ReconciliationsView;
  isPending: boolean;
  isError: boolean;
}) {
  const [onlyErrors, setOnlyErrors] = useState(false);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-muted/40 h-24 animate-pulse rounded-xl border" />
        <div className="bg-muted/40 h-64 animate-pulse rounded-xl border" />
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

  const failed = data.runs.filter((r) => r.status === "FAILED").length;
  const runs = onlyErrors
    ? data.runs.filter((r) => r.status === "FAILED")
    : data.runs;

  return (
    <div className="flex flex-col gap-4">
      <ImportSummary data={data} />

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">
          Execuções{" "}
          <span className="text-muted-foreground font-normal tabular-nums">
            ({fmtInt.format(data.runs.length)})
          </span>
        </h3>
        {failed > 0 ? (
          <button
            type="button"
            aria-pressed={onlyErrors}
            onClick={() => setOnlyErrors((v) => !v)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              onlyErrors
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Somente erros ({failed})
          </button>
        ) : null}
      </div>

      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <tr>
              <th className="px-4 py-2.5 font-medium">Janela</th>
              <th className="px-4 py-2.5 font-medium">Fonte</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Novos</th>
              <th className="px-4 py-2.5 text-right font-medium">Dedup.</th>
              <th className="px-4 py-2.5 font-medium">Início</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {runs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-10 text-center"
                >
                  {onlyErrors
                    ? "Nenhuma execução com erro."
                    : "Nenhuma execução ainda."}
                </td>
              </tr>
            ) : (
              runs.map((run: ReconciliationRun) => (
                <Fragment key={run.id}>
                  <tr className={cn(run.error && "border-b-0")}>
                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap tabular-nums">
                      {windowLabel(run.window_from, run.window_to)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5">
                      {run.source}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {fmtInt.format(run.items_new)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-right tabular-nums">
                      {fmtInt.format(run.items_deduped)}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">
                      {fmtWhen.format(new Date(run.started_at))}
                    </td>
                  </tr>
                  {run.error ? (
                    <tr>
                      <td colSpan={6} className="px-4 pt-0 pb-2.5">
                        <p className="bg-destructive/5 text-destructive rounded-md px-3 py-1.5 text-xs">
                          {run.error}
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
