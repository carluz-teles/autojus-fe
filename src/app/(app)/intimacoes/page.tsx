"use client";

import { ArrowUpDown, CheckCircle2, Filter, Printer } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { IntimacaoDetail } from "@/features/intimacoes/components/intimacao-detail";
import { useIntimacoes } from "@/features/intimacoes/hooks/use-intimacoes";
import type { IntimacaoStatus } from "@/features/intimacoes/types";
import { formatCount } from "@/lib/format";
import { useDetailDrawer } from "@/lib/hooks/use-detail-drawer";

// Inbox das intimações capturadas do DJEN pelas OABs monitoradas. Dados reais via
// GET /v1/intimacoes (intimation → read model do BE), paginadas por cursor
// (prev/próxima) com busca server-side por número do processo.

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

const STATUS_LABEL: Record<IntimacaoStatus, string> = {
  ACTIVE: "Ativa",
  CANCELLED: "Cancelada",
};

export default function IntimacoesPage() {
  const {
    intimacoes,
    totalCount,
    total,
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

  const { selected, open, openItem, onOpenChange, onOpenChangeComplete } =
    useDetailDrawer(intimacoes);

  const countLabel = isPending
    ? "Sincronizando…"
    : totalCount === total
      ? `${formatCount(total)} ${total === 1 ? "intimação" : "intimações"}`
      : `${formatCount(totalCount)} de ${formatCount(total)} intimações`;

  return (
    <>
      <PageHeader
        title="Intimações"
        description="Publicações capturadas do DJEN pelas OABs monitoradas."
      />

      <ImportBanner />

      <div className="reveal mt-6 flex items-center gap-2 rounded-lg border border-emerald-200/70 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
        <CheckCircle2 className="size-4 shrink-0" />
        <span className="font-medium tabular-nums">{countLabel}</span>
      </div>

      <div className="reveal mt-4">
        <ListSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número do processo…"
        >
          <FilterChip>Hoje</FilterChip>
          <FilterChip>Responsável</FilterChip>
          <FilterChip icon={Filter}>Filtrar</FilterChip>
          <FilterChip icon={ArrowUpDown}>Ordenar</FilterChip>
          <FilterChip icon={Printer}>Imprimir</FilterChip>
        </ListSearchToolbar>
      </div>

      <div
        className="reveal bg-card mt-4 overflow-x-auto rounded-xl border shadow-sm"
        aria-busy={isFetching}
      >
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Nº do processo</th>
              <th className="px-5 py-3 font-medium">Publicação</th>
              <th className="px-5 py-3 font-medium">Tribunal / grau</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Início do prazo</th>
              <th className="px-5 py-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isPending ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  Carregando intimações…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-red-600">
                  Erro ao carregar intimações.
                </td>
              </tr>
            ) : intimacoes.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  {search
                    ? `Nenhum resultado para “${search}”.`
                    : "Nenhuma intimação capturada ainda."}
                </td>
              </tr>
            ) : (
              intimacoes.map((it) => (
                <tr
                  key={it.id}
                  onClick={() => openItem(it)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openItem(it);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir intimação ${it.cnj_number}`}
                  aria-current={selected?.id === it.id ? "true" : undefined}
                  className="hover:bg-muted/40 focus-visible:ring-ring/50 aria-[current=true]:bg-gold/5 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <td className="hover:text-gold px-5 py-4 font-medium tabular-nums">
                    {it.cnj_number}
                  </td>
                  <td className="text-muted-foreground px-5 py-4 tabular-nums">
                    {fmtDate(it.made_available_at)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-muted-foreground">{it.court}</span>
                    <Badge variant="outline" className="ml-2">
                      {it.degree}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">{it.type}</td>
                  <td className="text-muted-foreground px-5 py-4 tabular-nums">
                    {fmtDate(it.deadline_start_at)}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={
                        it.status === "CANCELLED" ? "secondary" : "default"
                      }
                    >
                      {STATUS_LABEL[it.status] ?? it.status}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!isPending && !error ? (
        <ListPagination
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageNumber={pageNumber}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={onPrev}
          onNext={onNext}
          totalCount={totalCount}
        />
      ) : null}

      <IntimacaoDetail
        intimacao={selected}
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      />
    </>
  );
}

function FilterChip({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      disabled
      className="text-muted-foreground bg-card inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm"
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {children}
    </button>
  );
}
