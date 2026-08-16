"use client";

import { Archive, PackageX, PauseCircle, Play, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { Label } from "@/components/ui/label";
import { ListPagination } from "@/components/ui/list-pagination";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  prazoTone,
  processoTone,
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { daysLeftLabel, prazoStatusLabel } from "@/features/prazos/lib/labels";
import { useProcessos } from "@/features/processos/hooks/use-processos";
import { useProcessosSummary } from "@/features/processos/hooks/use-processos-summary";
import { lifecycleLabel } from "@/features/processos/lib/labels";
import type { ProcessoView } from "@/features/processos/types";
import { formatClaimValueBRL, formatDate, shortId } from "@/lib/format";
import { cn } from "@/lib/utils";

// Lista de processos consolidados (court_case / court_record), capturados do DJEN
// e enriquecidos pelo DATAJUD. DataTable via GET /v1/processos (read model),
// paginada por cursor com busca server-side. As abas Tabs filtram por lifecycle
// (?lifecycle) em modo controlado; os filtros do drawer (Tribunal, Grau,
// Responsável) vêm das opções do envelope do BE e são sincronizados com a URL.

// Cada célula deriva de helpers (lib/format, lib/labels) — nada de cálculo no JSX.
// As colunas vivem DENTRO do componente por dependerem do map de prazos paralelo.

const statusTone = (p: ProcessoView): StatusTone =>
  processoTone(lifecycleLabel(p.lifecycle));

// Cor do texto da coluna "Prazo a vencer", resolvida do tom do status do prazo.
const PRAZO_TONE_TEXT: Record<StatusTone, string> = {
  neutral: "text-muted-foreground",
  info: "text-sky-600 dark:text-sky-400",
  warning: "text-gold",
  danger: "text-destructive",
  success: "text-emerald-700 dark:text-emerald-400",
};

// Filtros avançados do drawer, na ordem exibida. As opções vêm do envelope do
// BE (filterOptions); aqui só o rótulo da seção de cada um. lifecycle fica de
// fora — as abas Tabs são o controle dele.
const FILTER_KEYS = ["court", "degree", "assignee"] as const;
const FILTER_LABELS: Record<(typeof FILTER_KEYS)[number], string> = {
  court: "Tribunal",
  degree: "Grau",
  assignee: "Responsável",
};

// Célula de texto com truncamento por ellipsis + tooltip no hover com o valor
// completo (textos longos tipo órgão julgador / número do processo não devem
// estourar a coluna nem ficar ilegíveis).
function TruncatedCell({
  value,
  className,
  as: As = "span",
}: {
  value: string;
  className?: string;
  as?: "span" | "div";
}) {
  return (
    <Tooltip label={value}>
      <As className={cn("block w-full min-w-0 truncate", className)}>
        {value}
      </As>
    </Tooltip>
  );
}

// Badge de contagem das abas — sumiu só quando o summary ainda não chegou.
function TabCount({ value }: { value?: number }) {
  if (value == null) return null;
  return (
    <Badge variant="secondary" className="tabular-nums">
      {value}
    </Badge>
  );
}

// Badge de classe/assunto: w-fit (tamanho do conteúdo) p/ valores curtos, mas
// nunca ultrapassa a coluna (max-w-full truncate) e o tooltip preserva o valor
// completo no hover.
function BadgeCell({ value }: { value: string }) {
  const display = value || "—";
  return (
    <Tooltip label={display}>
      <Badge variant="secondary" className="max-w-full font-medium">
        <span className="min-w-0 truncate">{display}</span>
      </Badge>
    </Tooltip>
  );
}

export default function ProcessosPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground px-5 py-24 text-center">
          Carregando processos…
        </div>
      }
    >
      <ProcessosList />
    </Suspense>
  );
}

function ProcessosList() {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
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
    filters,
    setFilter,
    resetFilters,
    activeFilterCount,
    filterOptions,
    proximoPrazoPorProcesso,
    pageSize,
    setPageSize,
    pageNumber,
    canPrev,
    canNext,
    onPrev,
    onNext,
  } = useProcessos();

  const COLUMNS: DataTableColumn<ProcessoView>[] = [
    {
      key: "numero",
      header: "Nº",
      width: 64,
      cell: (p) => (
        <span className="bg-muted/60 text-muted-foreground inline-flex rounded-md px-2 py-0.5 font-mono text-xs tracking-wide">
          {shortId(p.case_id || p.id)}
        </span>
      ),
    },
    {
      key: "processo",
      header: "Processo",
      width: "13rem",
      cell: (p) => (
        <TruncatedCell
          value={p.cnj_number}
          className="group-hover:text-gold font-medium tabular-nums transition-colors"
        />
      ),
    },
    {
      key: "classe",
      header: "Classe",
      width: "9rem",
      cell: (p) => <BadgeCell value={p.class} />,
    },
    {
      key: "assunto",
      header: "Assunto",
      width: "9rem",
      cell: (p) => <BadgeCell value={p.subject} />,
    },
    {
      key: "orgao",
      header: "Órgão julgador",
      width: "15rem",
      cell: (p) => (
        <TruncatedCell
          value={p.judging_body || "—"}
          className="text-muted-foreground"
        />
      ),
    },
    {
      key: "distribuicao",
      header: "Distribuição",
      width: "7rem",
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
      width: "8rem",
      cell: (p) => (
        <span className="tabular-nums">
          {formatClaimValueBRL(p.claim_value)}
        </span>
      ),
    },
    {
      key: "prazo",
      header: "Prazo a vencer",
      width: "7rem",
      cell: (p) => {
        const prazo = proximoPrazoPorProcesso.get(p.id);
        if (!prazo) return <Badge variant="outline">Sem prazo</Badge>;
        const tone = prazoTone(prazoStatusLabel(prazo.status, prazo.days_left));
        return (
          <div className="flex flex-col">
            <span
              className={cn("font-medium tabular-nums", PRAZO_TONE_TEXT[tone])}
            >
              {daysLeftLabel(prazo.days_left)}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {formatDate(prazo.end_date)}
            </span>
          </div>
        );
      },
    },
    {
      key: "responsavel",
      header: "Responsável",
      width: "7rem",
      cell: (p) => (
        <TruncatedCell
          value={p.assigned_user_name || "—"}
          className="text-muted-foreground"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "8rem",
      cell: (p) => (
        <StatusBadge
          label={lifecycleLabel(p.lifecycle)}
          tone={processoTone(lifecycleLabel(p.lifecycle))}
        />
      ),
    },
  ];

  const rangeFrom =
    processos.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const rangeTo = (pageNumber - 1) * pageSize + processos.length;

  const hasAdvancedFilters = Boolean(
    filters.court || filters.degree || filters.assignee,
  );

  // Chaves com opções emitidas pelo BE no envelope (a ordem de FILTER_KEYS é a
  // exibida no drawer); lifecycle fica de fora por ser controlado pelas abas.
  const filterKeys = FILTER_KEYS.filter((key) =>
    Boolean(filterOptions?.[key]?.length),
  );

  const emptyLabel = useMemo(() => {
    if (search) return `Nenhum resultado para “${search}”.`;
    if (lifecycle)
      return `Nenhum processo ${lifecycleLabel(lifecycle).toLowerCase()}${
        hasAdvancedFilters ? " com os filtros aplicados" : ""
      }.`;
    if (hasAdvancedFilters)
      return "Nenhum processo encontrado com os filtros aplicados.";
    return "Nenhum processo capturado ainda.";
  }, [search, lifecycle, hasAdvancedFilters]);

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
        <Tabs
          defaultValue="TOTAL"
          value={lifecycle ?? "TOTAL"}
          onValueChange={(v) => setLifecycle(v === "TOTAL" ? null : v)}
        >
          <TabsList aria-label="Filtrar processos por situação">
            <TabsTrigger value="TOTAL">
              <Scale className="size-4" />
              Total
              <TabCount value={summary?.total} />
            </TabsTrigger>
            <TabsTrigger value="ACTIVE">
              <Play className="size-4" />
              Em andamento
              <TabCount value={summary?.em_andamento} />
            </TabsTrigger>
            <TabsTrigger value="SUSPENDED">
              <PauseCircle className="size-4" />
              Suspensos
              <TabCount value={summary?.suspensos} />
            </TabsTrigger>
            <TabsTrigger value="ARCHIVED">
              <Archive className="size-4" />
              Arquivados
              <TabCount value={summary?.arquivados} />
            </TabsTrigger>
            <TabsTrigger value="CLOSED">
              <PackageX className="size-4" />
              Baixados
              <TabCount value={summary?.baixados} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <div className="reveal mt-6">
        <FilterToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder="Buscar por número do processo…"
          onFilters={() => setFiltersOpen(true)}
          activeFilters={activeFilterCount}
        />
      </div>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent
          title="Filtros"
          description="Refine a listagem pelos filtros disponíveis."
          footer={
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Limpar tudo
            </Button>
          }
        >
          <div className="space-y-5">
            {filterKeys.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nenhum filtro disponível.
              </p>
            ) : (
              filterKeys.map((key) => (
                <div className="space-y-2" key={key}>
                  <Label htmlFor={`filtro-${key}`}>{FILTER_LABELS[key]}</Label>
                  <Select
                    id={`filtro-${key}`}
                    aria-label={`Filtrar por ${FILTER_LABELS[key].toLowerCase()}`}
                    value={filters[key] ?? ""}
                    onChange={(e) => setFilter(key, e.target.value)}
                    className="w-full"
                  >
                    <option value="">Todos</option>
                    {(filterOptions?.[key] ?? []).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

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
              {emptyLabel}
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
