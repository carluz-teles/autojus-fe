"use client";

import { Archive, PackageX, PauseCircle, Play, Scale } from "lucide-react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { KpiCard, KpiRow } from "@/components/ui/kpi-card";
import { ListPagination } from "@/components/ui/list-pagination";
import {
  processoTone,
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { useProcessos } from "@/features/processos/hooks/use-processos";
import { useProcessosSummary } from "@/features/processos/hooks/use-processos-summary";
import { lifecycleLabel } from "@/features/processos/lib/labels";
import type { ProcessoView } from "@/features/processos/types";
import { formatClaimValueBRL, formatDate } from "@/lib/format";

// Lista de processos consolidados (court_case / court_record), capturados do DJEN
// e enriquecidos pelo DATAJUD. KpiRow via GET /v1/processos/summary; DataTable via
// GET /v1/processos (read model), paginada por cursor com busca server-side.
// Cards de lifecycle são clicáveis: filtram a lista (?lifecycle) e marcam-se ativos.

// Cada célula deriva de helpers (lib/format, lib/labels) — nada de cálculo no JSX.
const COLUMNS: DataTableColumn<ProcessoView>[] = [
  {
    key: "processo",
    header: "Processo",
    cell: (p) => (
      <div className="flex flex-col">
        <span className="group-hover:text-gold font-medium tabular-nums transition-colors">
          {p.cnj_number}
        </span>
        <span className="text-muted-foreground line-clamp-1 text-xs">
          {[p.class, p.subject].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>
    ),
  },
  {
    key: "cliente",
    header: "Cliente",
    cell: () => <span className="text-muted-foreground">—</span>,
  },
  {
    key: "orgao",
    header: "Órgão julgador",
    cell: (p) => (
      <span className="text-muted-foreground">{p.judging_body || "—"}</span>
    ),
  },
  {
    key: "distribuicao",
    header: "Distribuição",
    cell: (p) => (
      <span className="text-muted-foreground tabular-nums">
        {formatDate(p.filed_at)}
      </span>
    ),
  },
  {
    key: "valor",
    header: "Valor da causa",
    align: "right",
    cell: (p) => (
      <span className="tabular-nums">{formatClaimValueBRL(p.claim_value)}</span>
    ),
  },
  {
    key: "responsavel",
    header: "Responsável",
    cell: (p) => (
      <span className="text-muted-foreground">
        {p.assigned_user_name || "—"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => (
      <StatusBadge
        label={lifecycleLabel(p.lifecycle)}
        tone={processoTone(lifecycleLabel(p.lifecycle))}
      />
    ),
  },
];

const statusTone = (p: ProcessoView): StatusTone =>
  processoTone(lifecycleLabel(p.lifecycle));

export default function ProcessosPage() {
  const router = useRouter();
  const { summary } = useProcessosSummary();
  const {
    processos,
    totalCount,
    isPending,
    isFetching,
    error,
    search,
    setSearch,
    lifecycle,
    setLifecycle,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useProcessos();

  // Alterna o filtro por lifecycle: clicar no card ativo limpa; senão aplica.
  const toggleLifecycle = (value: string) =>
    setLifecycle(lifecycle === value ? null : value);

  const fmt = (n?: number) => (n == null ? "—" : n);
  const rangeFrom =
    processos.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const rangeTo = (pageNumber - 1) * pageSize + processos.length;

  return (
    <>
      <PageHeader
        title="Processos"
        description="Processos consolidados a partir da captura (DJEN) e do enriquecimento (DATAJUD)."
        action={
          <Button size="sm" disabled>
            Novo processo
          </Button>
        }
      />

      <ImportBanner />

      <section className="reveal mt-8">
        <KpiRow cols={5}>
          <KpiCard
            icon={Scale}
            label="Total"
            value={fmt(summary?.total)}
            tone="neutral"
            onClick={() => setLifecycle(null)}
            active={lifecycle === null}
          />
          <KpiCard
            icon={Play}
            label="Em andamento"
            value={fmt(summary?.em_andamento)}
            tone="info"
            onClick={() => toggleLifecycle("ACTIVE")}
            active={lifecycle === "ACTIVE"}
          />
          <KpiCard
            icon={PauseCircle}
            label="Suspensos"
            value={fmt(summary?.suspensos)}
            tone="warning"
            onClick={() => toggleLifecycle("SUSPENDED")}
            active={lifecycle === "SUSPENDED"}
          />
          <KpiCard
            icon={Archive}
            label="Arquivados"
            value={fmt(summary?.arquivados)}
            tone="neutral"
            onClick={() => toggleLifecycle("ARCHIVED")}
            active={lifecycle === "ARCHIVED"}
          />
          <KpiCard
            icon={PackageX}
            label="Baixados"
            value={fmt(summary?.baixados)}
            tone="neutral"
            onClick={() => toggleLifecycle("CLOSED")}
            active={lifecycle === "CLOSED"}
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
          rows={processos}
          rowKey={(p) => p.id}
          statusTone={statusTone}
          onRowClick={(p) => router.push(`/processos/${p.id}`)}
          rowActions={(p) => [{ label: "Abrir", href: `/processos/${p.id}` }]}
          isLoading={isPending || (isFetching && processos.length === 0)}
          loadingLabel="Carregando processos…"
          error={error ? "Erro ao carregar processos." : undefined}
          empty={
            <p className="text-muted-foreground px-5 py-10 text-center">
              {search
                ? `Nenhum resultado para “${search}”.`
                : "Nenhum processo capturado ainda."}
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
