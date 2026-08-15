"use client";

import {
  Archive,
  CheckCircle2,
  Inbox,
  ScanSearch,
  ScrollText,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  intimacaoTone,
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { useIntimacaoActions } from "@/features/intimacoes/hooks/use-intimacao-actions";
import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import { useIntimacoesSummary } from "@/features/intimacoes/hooks/use-intimacoes-summary";
import {
  daysLeftLabel,
  TYPE_LABEL,
  userStatusLabel,
} from "@/features/intimacoes/lib/labels";
import type { IntimacaoView } from "@/features/intimacoes/types";
import { formatDate, shortId } from "@/lib/format";

// Inbox das intimações capturadas do DJEN pelas OABs monitoradas. KpiRow via GET
// /v1/intimacoes/summary; DataTable via GET /v1/intimacoes (read model), paginada
// por cursor com busca server-side. AÇÃO por linha: ver / resolver / ignorar.

const statusTone = (it: IntimacaoView): StatusTone =>
  intimacaoTone(userStatusLabel(it.user_status));

// Colunas com derivação delegada a helpers (lib/format, lib/labels) — nada no JSX.
const COLUMNS: DataTableColumn<IntimacaoView>[] = [
  {
    key: "intimacao",
    header: "Intimação",
    cell: (it) => (
      <span className="bg-muted/60 text-muted-foreground inline-flex rounded-md px-2 py-0.5 font-mono text-xs tracking-wide">
        {shortId(it.id)}
      </span>
    ),
  },
  {
    key: "processo",
    header: "Processo",
    cell: (it) => (
      <div className="flex flex-col">
        <span className="group-hover:text-gold font-medium tabular-nums transition-colors">
          {it.cnj_number}
        </span>
        <span className="text-muted-foreground text-xs">{it.court}</span>
      </div>
    ),
  },
  {
    key: "teor",
    header: "Ato / teor",
    cell: (it) => (
      <span className="text-muted-foreground line-clamp-2 max-w-md text-xs">
        {it.content_preview || "—"}
      </span>
    ),
  },
  {
    key: "publicacao",
    header: "Publicação",
    cell: (it) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(it.published_at)}
      </span>
    ),
  },
  {
    key: "prazo",
    header: "Prazo",
    cell: (it) => {
      const left = daysLeftLabel(it.deadline_start_at);
      return (
        <div className="flex flex-col">
          <span className="tabular-nums">
            {formatDate(it.deadline_start_at)}
          </span>
          {left ? (
            <span className="text-muted-foreground text-xs">{left}</span>
          ) : null}
        </div>
      );
    },
  },
  {
    key: "classe",
    header: "Classe",
    cell: (it) => (
      <span className="text-muted-foreground">
        {TYPE_LABEL[it.type] ?? it.type}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (it) => (
      <StatusBadge
        label={userStatusLabel(it.user_status)}
        tone={intimacaoTone(userStatusLabel(it.user_status))}
      />
    ),
  },
];

export default function IntimacoesPage() {
  const router = useRouter();
  const { summary } = useIntimacoesSummary();
  const { resolve, ignore } = useIntimacaoActions();
  const {
    intimacoes,
    totalCount,
    isPending,
    isFetching,
    error,
    search,
    setSearch,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useIntimacoes();

  const fmt = (n?: number) => (n == null ? "—" : n);
  const rangeFrom =
    intimacoes.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const rangeTo = (pageNumber - 1) * pageSize + intimacoes.length;

  const rowActions = (it: IntimacaoView) => [
    { label: "Ver", icon: ScanSearch, href: `/intimacoes/${it.id}` },
    {
      label: "Marcar como resolvida",
      icon: CheckCircle2,
      onSelect: () => resolve.mutate(it.id),
      disabled: it.user_status === "RESOLVED" || resolve.isPending,
    },
    {
      label: "Ignorar",
      icon: Archive,
      onSelect: () => ignore.mutate(it.id),
      disabled: it.user_status === "IGNORED" || ignore.isPending,
    },
  ];

  return (
    <>
      <PageHeader
        title="Intimações"
        description="Publicações capturadas do DJEN pelas OABs monitoradas."
      />

      <ImportBanner />

      <section className="reveal mt-8">
        <KpiRow cols={5}>
          <KpiCard
            icon={Inbox}
            label="Total"
            value={fmt(summary?.total)}
            tone="neutral"
          />
          <KpiCard
            icon={ScrollText}
            label="Pendentes"
            value={fmt(summary?.pendentes)}
            tone="warning"
          />
          <KpiCard
            icon={ScanSearch}
            label="Em análise"
            value={fmt(summary?.em_analise)}
            tone="info"
          />
          <KpiCard
            icon={CheckCircle2}
            label="Resolvidas"
            value={fmt(summary?.resolvidas)}
            tone="success"
          />
          <KpiCard
            icon={Archive}
            label="Ignoradas"
            value={fmt(summary?.ignoradas)}
            tone="neutral"
          />
        </KpiRow>
      </section>

      <div className="reveal mt-6">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por número do processo…"
        />
      </div>

      <div className="reveal mt-4">
        <DataTable
          columns={COLUMNS}
          rows={intimacoes}
          rowKey={(it) => it.id}
          statusTone={statusTone}
          onRowClick={(it) => router.push(`/intimacoes/${it.id}`)}
          rowActions={rowActions}
          isLoading={isPending || (isFetching && intimacoes.length === 0)}
          loadingLabel="Carregando intimações…"
          error={error ? "Erro ao carregar intimações." : undefined}
          empty={
            <p className="text-muted-foreground px-5 py-10 text-center">
              {search
                ? `Nenhum resultado para “${search}”.`
                : "Nenhuma intimação capturada ainda."}
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
