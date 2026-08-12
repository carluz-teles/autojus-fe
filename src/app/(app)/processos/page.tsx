"use client";

import { Archive, CheckCircle2, Scale } from "lucide-react";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListPagination } from "@/components/ui/list-pagination";
import { ListSearchToolbar } from "@/components/ui/list-search-toolbar";
import { ImportBanner } from "@/features/import-status/components/import-banner";
import { ProcessoDetail } from "@/features/processos/components/processo-detail";
import { useProcessos } from "@/features/processos/hooks/use-processos";
import type { ProcessoView } from "@/features/processos/types";
import { formatCount } from "@/lib/format";
import { useDetailDrawer } from "@/lib/hooks/use-detail-drawer";

// Lista de processos consolidados (court_case / court_record), capturados do DJEN e
// enriquecidos pelo DATAJUD. Dados reais via GET /v1/processos (read model do BE),
// paginados por cursor (prev/próxima) com busca server-side por número.

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function lastMovement(p: ProcessoView): string {
  if (!p.last_movement_text) return "—";
  const when = p.last_movement_at ? `${fmtDate(p.last_movement_at)} — ` : "";
  return `${when}${p.last_movement_text}`;
}

export default function ProcessosPage() {
  const {
    processos,
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
  } = useProcessos();

  const { selected, open, openItem, onOpenChange, onOpenChangeComplete } =
    useDetailDrawer(processos);

  // "X de Y" quando há filtro (o total do filtro difere do global); só o total senão.
  const countValue = isPending
    ? "—"
    : totalCount === total
      ? formatCount(total)
      : `${formatCount(totalCount)} de ${formatCount(total)}`;

  const stats = [
    { label: "Processos", value: countValue, icon: Scale },
    { label: "Fechamentos no mês", value: "—", icon: CheckCircle2 },
    { label: "Arquivados no mês", value: "—", icon: Archive },
  ];

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

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className="reveal bg-card rounded-xl border p-5 shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{label}</span>
              <Icon className="text-gold size-4" />
            </div>
            <p className="font-display mt-3 text-3xl leading-none tabular-nums">
              {value}
            </p>
          </div>
        ))}
      </section>

      <div className="reveal mt-6">
        <ListSearchToolbar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número do processo…"
        />
      </div>

      <div
        className="reveal bg-card mt-4 overflow-x-auto rounded-xl border shadow-sm"
        aria-busy={isFetching}
      >
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs tracking-wide uppercase">
            <tr>
              <th className="px-5 py-3 font-medium">Nº do processo</th>
              <th className="px-5 py-3 font-medium">Tribunal / grau</th>
              <th className="px-5 py-3 font-medium">Classe</th>
              <th className="px-5 py-3 font-medium">Órgão julgador</th>
              <th className="px-5 py-3 font-medium">Último andamento</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isPending ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  Carregando processos…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-red-600">
                  Erro ao carregar processos.
                </td>
              </tr>
            ) : processos.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-muted-foreground px-5 py-10 text-center"
                >
                  {search
                    ? `Nenhum resultado para “${search}”.`
                    : "Nenhum processo capturado ainda."}
                </td>
              </tr>
            ) : (
              processos.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => openItem(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openItem(p);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir processo ${p.cnj_number}`}
                  aria-current={selected?.id === p.id ? "true" : undefined}
                  className="hover:bg-muted/40 focus-visible:ring-ring/50 aria-[current=true]:bg-gold/5 cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <td className="hover:text-gold px-5 py-4 font-medium tabular-nums">
                    {p.cnj_number}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-muted-foreground">{p.court}</span>
                    <Badge variant="outline" className="ml-2">
                      {p.degree}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {p.class || "—"}
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {p.judging_body || "—"}
                  </td>
                  <td className="text-muted-foreground px-5 py-4">
                    {lastMovement(p)}
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

      <ProcessoDetail
        processo={selected}
        open={open}
        onOpenChange={onOpenChange}
        onOpenChangeComplete={onOpenChangeComplete}
      />
    </>
  );
}
