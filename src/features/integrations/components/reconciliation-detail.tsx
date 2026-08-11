"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileText,
  Gavel,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import {
  useReconciliationDetail,
  useSyncRunItems,
} from "../hooks/use-reconciliations";
import type {
  Reconciliation,
  ReconciliationWindow,
  SyncRunStatus,
} from "../types";

// Tela de detalhe de uma importação (reconciliação): o cabeçalho agregado + a
// tabela de todas as janelas (sync_run). Cada janela abre um collapse que
// lista, sob demanda, os processos e intimações que AQUELA janela trouxe.

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

function WindowStatus({ status }: { status: SyncRunStatus }) {
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

function ReconciliationHeader({ u }: { u: Reconciliation }) {
  return (
    <section className="reveal bg-card mt-6 grid grid-cols-2 gap-4 rounded-xl border p-5 shadow-sm sm:grid-cols-4">
      <Stat icon={Gavel} label="Processos" value={fmtInt.format(u.processos)} />
      <Stat
        icon={FileText}
        label="Intimações"
        value={fmtInt.format(u.intimacoes)}
      />
      <div>
        <p className="font-display text-2xl leading-none tabular-nums">
          {u.slices_ok}
          <span className="text-muted-foreground text-lg">
            /{u.total_slices}
          </span>
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Janelas concluídas
          {u.slices_error > 0 ? (
            <span className="text-amber-700 dark:text-amber-500">
              {" "}
              · {u.slices_error} com erro
            </span>
          ) : null}
        </p>
      </div>
      <div>
        <p className="font-display text-lg leading-tight tabular-nums">
          {windowLabel(u.window_from, u.window_to)}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">Janela de prazo</p>
      </div>
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gavel;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="text-gold/70 size-4" />
        <p className="font-display text-2xl leading-none tabular-nums">
          {value}
        </p>
      </div>
      <p className="text-muted-foreground mt-1 text-xs">{label}</p>
    </div>
  );
}

// A linha de uma janela + o collapse com seus itens (lazy: só busca ao expandir).
function WindowRow({ w }: { w: ReconciliationWindow }) {
  const [open, setOpen] = useState(false);
  const { data, isPending, isError } = useSyncRunItems(w.id, open);
  const hasItems = w.processos_new > 0 || w.intimacoes_new > 0;

  return (
    <Fragment>
      <tr
        className={cn(
          "hover:bg-muted/40 transition-colors",
          hasItems && "cursor-pointer",
          open && "bg-muted/30",
        )}
        onClick={hasItems ? () => setOpen((v) => !v) : undefined}
        aria-expanded={hasItems ? open : undefined}
      >
        <td className="w-8 py-2.5 pl-4">
          {hasItems ? (
            <ChevronRight
              className={cn(
                "text-muted-foreground size-4 transition-transform",
                open && "rotate-90",
              )}
            />
          ) : null}
        </td>
        <td className="py-2.5 pr-4 font-mono text-xs whitespace-nowrap tabular-nums">
          {windowLabel(w.window_from, w.window_to)}
        </td>
        <td className="px-4 py-2.5">
          <WindowStatus status={w.status} />
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums">
          {fmtInt.format(w.processos_new)}
        </td>
        <td className="px-4 py-2.5 text-right tabular-nums">
          {fmtInt.format(w.intimacoes_new)}
        </td>
        <td className="text-muted-foreground px-4 py-2.5 text-xs whitespace-nowrap">
          {fmtWhen.format(new Date(w.started_at))}
        </td>
      </tr>

      {w.error ? (
        <tr>
          <td colSpan={6} className="px-4 pt-0 pb-2.5">
            <p className="bg-destructive/5 text-destructive rounded-md px-3 py-1.5 text-xs">
              {w.error}
            </p>
          </td>
        </tr>
      ) : null}

      {open ? (
        <tr>
          <td colSpan={6} className="bg-muted/20 px-4 py-4">
            {isPending ? (
              <p className="text-muted-foreground text-sm">Carregando itens…</p>
            ) : isError || !data ? (
              <p className="text-destructive text-sm">
                Não foi possível carregar os itens desta janela.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ItemList
                  title="Processos"
                  icon={Gavel}
                  empty="Nenhum processo novo nesta janela."
                  lines={data.processos.map((p) => ({
                    id: p.id,
                    primary: p.cnj_number,
                    secondary: [p.court, p.degree, p.class]
                      .filter(Boolean)
                      .join(" · "),
                  }))}
                />
                <ItemList
                  title="Intimações"
                  icon={FileText}
                  empty="Nenhuma intimação nova nesta janela."
                  lines={data.intimacoes.map((i) => ({
                    id: i.id,
                    primary: i.cnj_number,
                    secondary: [i.court, i.degree, i.type]
                      .filter(Boolean)
                      .join(" · "),
                  }))}
                />
              </div>
            )}
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
}

function ItemList({
  title,
  icon: Icon,
  empty,
  lines,
}: {
  title: string;
  icon: typeof Gavel;
  empty: string;
  lines: { id: string; primary: string; secondary: string }[];
}) {
  return (
    <div className="bg-card rounded-lg border">
      <div className="text-muted-foreground flex items-center gap-1.5 border-b px-3 py-2 text-xs font-medium tracking-wide uppercase">
        <Icon className="size-3.5" /> {title}
        <span className="tabular-nums">({fmtInt.format(lines.length)})</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-sm">{empty}</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {lines.map((l) => (
            <li key={l.id} className="px-3 py-2">
              <p className="font-medium tabular-nums">{l.primary}</p>
              <p className="text-muted-foreground text-xs">{l.secondary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReconciliationDetail({ jobId }: { jobId: string }) {
  const { data, isPending, isError } = useReconciliationDetail(jobId);

  return (
    <>
      <Link
        href="/settings/integrations"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" /> Integrações
      </Link>

      {isPending ? (
        <div className="flex flex-col gap-4">
          <div className="bg-muted/40 h-24 animate-pulse rounded-xl border" />
          <div className="bg-muted/40 h-64 animate-pulse rounded-xl border" />
        </div>
      ) : isError || !data ? (
        <p className="text-destructive text-sm" role="alert">
          Não foi possível carregar esta importação.
        </p>
      ) : (
        <>
          <PageHeader
            title={`Importação ${data.reconciliation.source}`}
            description={`${windowLabel(data.reconciliation.window_from, data.reconciliation.window_to)} · ${fmtInt.format(data.reconciliation.processos)} processos · ${fmtInt.format(data.reconciliation.intimacoes)} intimações`}
            action={
              <Badge variant="outline">{data.reconciliation.status}</Badge>
            }
          />

          <ReconciliationHeader u={data.reconciliation} />

          <h2 className="mt-8 mb-3 text-sm font-medium">
            Janelas{" "}
            <span className="text-muted-foreground font-normal tabular-nums">
              ({fmtInt.format(data.windows.length)})
            </span>
          </h2>

          <div className="reveal bg-card overflow-hidden rounded-xl border shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
                <tr>
                  <th className="w-8 py-2.5 pl-4" />
                  <th className="py-2.5 pr-4 font-medium">Janela</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Processos
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    Intimações
                  </th>
                  <th className="px-4 py-2.5 font-medium">Início</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.windows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-4 py-10 text-center"
                    >
                      Nenhuma janela nesta importação.
                    </td>
                  </tr>
                ) : (
                  data.windows.map((w) => <WindowRow key={w.id} w={w} />)
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
