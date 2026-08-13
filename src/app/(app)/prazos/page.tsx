"use client";

import {
  AlarmClock,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  FolderOpen,
  Timer,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  prazoTone,
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import {
  type PrazoStatusFilter,
  usePrazosAgenda,
} from "@/features/prazos/hooks/use-prazos-agenda";
import { usePrazosSummary } from "@/features/prazos/hooks/use-prazos-summary";
import {
  daysLeftLabel,
  kindLabel,
  prazoStatusLabel,
} from "@/features/prazos/lib/labels";
import type { PrazoAgendaView } from "@/features/prazos/types";
import { formatDate } from "@/lib/format";

// Agenda global de prazos (deadline) — vencimentos calculados no calendário
// forense. KpiRow via GET /v1/prazos/summary; DataTable via GET /v1/prazos (read
// model), paginada por cursor e filtrada por status. A coluna STATUS deriva de
// (status, days_left) pelo helper prazoStatusLabel; nada de cálculo no JSX.

// Chip curto do id da intimação de origem (não há código humano do ato).
function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase() || "—";
}

const statusTone = (p: PrazoAgendaView): StatusTone =>
  prazoTone(prazoStatusLabel(p.status, p.days_left));

// Colunas com derivação delegada a helpers (lib/format, lib/labels) — nada no JSX.
const COLUMNS: DataTableColumn<PrazoAgendaView>[] = [
  {
    key: "prazo",
    header: "Prazo",
    cell: (p) => (
      <div className="flex flex-col">
        <span className="group-hover:text-gold font-medium tabular-nums transition-colors">
          {formatDate(p.end_date)}
        </span>
        <span className="text-muted-foreground text-xs">
          {prazoStatusLabel(p.status, p.days_left)}
        </span>
      </div>
    ),
  },
  {
    key: "processo",
    header: "Processo",
    cell: (p) => (
      <div className="flex flex-col">
        <span className="tabular-nums">{p.cnj_number}</span>
        {p.court ? (
          <span className="text-muted-foreground text-xs">{p.court}</span>
        ) : null}
      </div>
    ),
  },
  {
    key: "intimacao",
    header: "Intimação",
    cell: (p) =>
      p.intimation_id ? (
        <Link
          href={`/intimacoes/${p.intimation_id}`}
          onClick={(e) => e.stopPropagation()}
          className="bg-muted/60 text-muted-foreground hover:text-gold inline-flex rounded-md px-2 py-0.5 font-mono text-xs tracking-wide transition-colors"
        >
          {shortId(p.intimation_id)}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "tipo",
    header: "Tipo",
    cell: (p) => (
      <span className="text-muted-foreground">{kindLabel(p.kind)}</span>
    ),
  },
  {
    key: "inicio",
    header: "Início",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    key: "fim",
    header: "Fim",
    cell: (p) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(p.end_date)}
      </span>
    ),
  },
  {
    key: "dias",
    header: "Dias rest.",
    align: "right",
    cell: (p) => (
      <span className="tabular-nums">{daysLeftLabel(p.days_left)}</span>
    ),
  },
  {
    key: "responsavel",
    header: "Responsável",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => {
      const label = prazoStatusLabel(p.status, p.days_left);
      return <StatusBadge label={label} tone={prazoTone(label)} />;
    },
  },
];

export default function PrazosPage() {
  const { summary } = usePrazosSummary();
  const {
    prazos,
    totalCount,
    isPending,
    isFetching,
    error,
    status,
    setStatus,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = usePrazosAgenda();

  // Alterna o filtro por status: clicar no card ativo limpa; senão aplica. Só os
  // buckets que casam com um status do BE (?status=) são clicáveis — Críticos e
  // Vencendo são subconjuntos de OPEN por days_left, não filtráveis server-side.
  const toggleStatus = (value: PrazoStatusFilter) =>
    setStatus(status === value ? "" : value);

  const fmt = (n?: number) => (n == null ? "—" : n);
  const rangeFrom = prazos.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const rangeTo = (pageNumber - 1) * pageSize + prazos.length;

  return (
    <>
      <PageHeader
        title="Prazos"
        description="Vencimentos calculados no calendário forense (dias úteis, recesso do art. 220)."
      />

      <section className="reveal mt-8">
        <KpiRow cols={6}>
          <KpiCard
            icon={CalendarClock}
            label="Total"
            value={fmt(summary?.total)}
            tone="neutral"
            onClick={() => setStatus("")}
            active={status === ""}
          />
          <KpiCard
            icon={CircleAlert}
            label="Críticos"
            value={fmt(summary?.criticos)}
            tone="danger"
          />
          <KpiCard
            icon={AlarmClock}
            label="Vencendo (3 dias)"
            value={fmt(summary?.vencendo)}
            tone="warning"
          />
          <KpiCard
            icon={FolderOpen}
            label="Abertos"
            value={fmt(summary?.abertos)}
            tone="info"
            onClick={() => toggleStatus("OPEN")}
            active={status === "OPEN"}
          />
          <KpiCard
            icon={CalendarDays}
            label="Futuros"
            value={fmt(summary?.futuros)}
            tone="neutral"
            onClick={() => toggleStatus("PENDING")}
            active={status === "PENDING"}
          />
          <KpiCard
            icon={Timer}
            label="Vencidos"
            value={fmt(summary?.vencidos)}
            tone="danger"
            onClick={() => toggleStatus("MISSED")}
            active={status === "MISSED"}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Cumpridos"
            value={fmt(summary?.cumpridos)}
            tone="success"
            onClick={() => toggleStatus("MET")}
            active={status === "MET"}
          />
        </KpiRow>
      </section>

      <div className="reveal mt-6">
        <DataTable
          columns={COLUMNS}
          rows={prazos}
          rowKey={(p) => p.id}
          statusTone={statusTone}
          rowActions={(p) => [{ label: "Ver", href: `/prazos/${p.id}` }]}
          isLoading={isPending || (isFetching && prazos.length === 0)}
          loadingLabel="Carregando prazos…"
          error={error ? "Erro ao carregar os prazos." : undefined}
          empty={
            <p className="text-muted-foreground px-5 py-10 text-center">
              {status
                ? "Nenhum prazo neste status."
                : "Nenhum prazo em aberto — os prazos nascem das intimações capturadas e são calculados no calendário forense."}
            </p>
          }
          rangeFrom={error ? undefined : rangeFrom}
          rangeTo={error ? undefined : rangeTo}
          total={error ? undefined : totalCount}
          pagination={
            !isPending && !error ? (
              <ListPagination
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={onPrev}
                onNext={onNext}
              />
            ) : undefined
          }
        />
      </div>
    </>
  );
}
