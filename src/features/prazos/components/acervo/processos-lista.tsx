"use client";

import { ChevronRight, FolderSearch } from "lucide-react";
import Link from "next/link";

import { InfiniteListFooter } from "@/components/shell/infinite-list-footer";
import { ListToolbar } from "@/components/shell/list-toolbar";
import { PageFrame } from "@/components/shell/page-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterTabs } from "@/features/intimacoes/components/shared/filter-tabs";
import { Responsavel } from "@/features/organization/components/responsavel";
import { ProcessoSituacao } from "@/features/processos/components/situacao-processo";
import { cn } from "@/lib/utils";

import { useAcervoProcessos } from "../../hooks/use-acervo-processos";

type Linha = ReturnType<typeof useAcervoProcessos>["rows"][number];

export function ProcessosLista() {
  const m = useAcervoProcessos();
  return (
    <PageFrame
      header={
        <>
          <h1 className="shrink-0 text-[13px] font-medium">Processos</h1>
          <span
            className="text-fg3 min-w-0 truncate font-mono text-[11px]"
            aria-live="polite"
          >
            {m.isLoading ? "Carregando…" : m.totalLabel}
          </span>
        </>
      }
      toolbar={
        <>
          <ListToolbar
            search={m.search}
            onSearch={m.setSearch}
            searchLabel="Buscar processos"
            placeholder="Buscar por CNJ, partes ou título…"
            filters={m.filters}
            active={m.active}
            onClear={m.clear}
          />
          <FilterTabs
            label="Filtrar por situação do processo"
            title="Situação"
            tabs={m.tabs}
          />
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-5">
        <p
          role="status"
          aria-live="polite"
          className="text-muted-foreground min-h-5 text-xs"
        >
          {m.isLoading
            ? "Carregando processos…"
            : m.updating
              ? "Atualizando resultados…"
              : m.statusLabel}
        </p>
        {m.isError && !m.loadMoreError ? (
          <div
            role="alert"
            className="border-destructive/20 bg-destructive/5 flex flex-col items-start gap-3 rounded-xl border p-5 shadow-sm"
          >
            <p>Não foi possível atualizar os processos.</p>
            <Button variant="outline" onClick={m.retry}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {m.isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : !m.rows.length && !m.isError ? (
          <EmptyState
            icon={FolderSearch}
            title="Nenhum processo neste recorte"
            description="Revise a busca, os filtros ou a situação selecionada."
            action={
              <Button variant="outline" onClick={m.clear}>
                Limpar busca e filtros
              </Button>
            }
          />
        ) : (
          <div
            aria-busy={m.updating}
            inert={m.updating}
            className={cn(
              "border-border bg-card min-w-0 overflow-hidden rounded-xl border shadow-sm",
              m.updating && "opacity-60",
            )}
          >
            <div
              aria-hidden
              className="border-border bg-muted/30 text-muted-foreground hidden grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_190px] items-center gap-5 border-b px-5 py-2.5 text-[11px] font-medium tracking-wide uppercase xl:grid"
            >
              <span>Processo e partes</span>
              <span>Acompanhamento</span>
              <span>Responsável e situação</span>
            </div>
            <ul>
              {m.rows.map((r) => (
                <li
                  key={r.id}
                  className="border-border border-b last:border-b-0"
                >
                  <LinhaProcesso row={r} />
                </li>
              ))}
            </ul>
          </div>
        )}
        {!m.isLoading && m.rows.length > 0 ? (
          <InfiniteListFooter
            paginationKey={m.paginationKey}
            hasMore={m.hasMore}
            loading={m.isLoadingMore}
            paused={m.updating}
            error={m.loadMoreError}
            onLoadMore={m.loadMore}
          />
        ) : null}
      </div>
    </PageFrame>
  );
}

function LinhaProcesso({ row: r }: { row: Linha }) {
  return (
    <article className="hover:bg-muted/25 grid min-w-0 gap-4 px-4 py-4 transition-colors sm:px-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_190px] xl:gap-5">
      <div className="min-w-0">
        <Link
          href={r.href}
          className="font-display text-foreground focus-visible:ring-ring hover:text-primary rounded text-base leading-snug font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          {r.title}
        </Link>
        <p className="text-primary mt-1.5 font-mono text-xs font-medium">
          {r.cnj}
        </p>
        {r.partes ? (
          <p
            className="text-muted-foreground mt-1 line-clamp-2 text-[13px]"
            title={r.partes}
          >
            {r.partes}
          </p>
        ) : (
          <p className="text-muted-foreground mt-2 text-xs">
            Partes não informadas
          </p>
        )}
        {r.classeAssunto && r.classeAssunto !== r.title ? (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
            {r.classeAssunto}
          </p>
        ) : null}
        <p className="text-muted-foreground mt-2 text-xs">{r.tribunal}</p>
        <p
          className="text-muted-foreground mt-1 line-clamp-2 text-xs"
          title={r.orgao}
        >
          {r.orgao}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">Próximo prazo ativo</p>
        {r.prazo ? (
          <>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  r.prazo.variant === "destructive"
                    ? "text-destructive"
                    : r.prazo.variant === "warning"
                      ? "text-gold-foreground"
                      : "text-primary",
                )}
              >
                {r.prazo.data}
              </span>
              <Badge variant={r.prazo.variant}>{r.prazo.ato}</Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {r.prazo.resumo}
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm">Nenhum prazo ativo registrado</p>
        )}
        <div className="border-border mt-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            Última movimentação · {r.movimentoData}
          </p>
          <p
            className="mt-1.5 line-clamp-2 text-sm leading-relaxed"
            title={r.movimento}
          >
            {r.movimento}
          </p>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs xl:sr-only">Responsável</p>
        <Responsavel value={r.responsavelId} nome={r.responsavel} />
        <div className="mt-2">
          <ProcessoSituacao situacao={r.situacaoDetalhe} />
        </div>
        {r.fase ? (
          <p className="text-muted-foreground mt-2 text-xs">Fase: {r.fase}</p>
        ) : null}
        <Link
          href={r.href}
          aria-label={`Abrir processo ${r.cnj}`}
          className="text-primary focus-visible:ring-ring mt-3 inline-flex h-8 items-center gap-1 rounded text-xs font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
        >
          Abrir processo
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
