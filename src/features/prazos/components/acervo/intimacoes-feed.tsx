"use client";

import { Search } from "lucide-react";
import Link from "next/link";

import { useAcervoIntimacoes } from "../../hooks/use-acervo-intimacoes";
import { TableFilter } from "./table-filter";

// Grade das colunas (inline p/ evitar o parser de valores arbitrários do Tailwind
// engasgar com `fr` decimal). Header e linhas compartilham a mesma definição.
// Publicado / Providência / Nº CNJ / Origem / Prazo / Status.
const COLS = "72px minmax(0,1.6fr) 150px minmax(0,1fr) 92px 96px";

// Acervo · Intimações (feed do DJEN sobre o backend real): busca server-side,
// tabs de urgência (buckets), facetas (tipo/tribunal/situação) e paginação por
// cursor ("Mostrar mais"). O componente só faz JSX + binding — a lógica vive no
// hook useAcervoIntimacoes.
export function IntimacoesFeed() {
  const feed = useAcervoIntimacoes();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">Intimações · Feed</span>
        <span className="text-fg3 font-mono text-[11px]">
          {feed.totalLabel}
        </span>
      </header>

      {/* Tabs de urgência (buckets) */}
      <div className="border-line flex items-center gap-0.5 border-b px-3">
        {feed.tabs.map((t) => (
          <button
            key={t.key || "todas"}
            type="button"
            onClick={t.onClick}
            className="-mb-px border-b-2 px-2.5 pt-2 pb-2.5 text-[12.5px]"
            style={{
              color: t.ativo ? "var(--fg)" : "var(--fg3)",
              borderBottomColor: t.ativo ? "var(--primary)" : "transparent",
              fontWeight: t.ativo ? 500 : 400,
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span className="text-fg3 ml-1 font-mono text-[10.5px]">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar: busca + facetas */}
      <div className="border-line flex items-center gap-2 border-b px-4 py-2">
        <div className="border-line bg-panel flex h-8 w-[260px] items-center gap-2 rounded-lg border px-2.5">
          <Search className="text-fg3 size-3.5" />
          <input
            value={feed.search}
            onChange={(e) => feed.setSearch(e.target.value)}
            placeholder="Buscar por nº CNJ…"
            className="flex-1 bg-transparent text-[12.5px] outline-none"
          />
        </div>

        <div className="ml-auto">
          <TableFilter groups={feed.filtros} />
        </div>
      </div>

      {/* Scroll area: header sticky + linhas */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="border-line text-fg3 sticky top-0 z-[3] grid gap-3.5 border-b px-6 py-[9px] text-[10.5px] font-medium tracking-[0.05em] uppercase backdrop-blur-[6px] [background:color-mix(in_oklch,var(--bg)_92%,transparent)]"
          style={{ gridTemplateColumns: COLS }}
        >
          <span>Publicado</span>
          <span>Providência</span>
          <span>Nº CNJ</span>
          <span>Origem</span>
          <span>Prazo</span>
          <span className="text-right">Status</span>
        </div>

        {feed.isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="border-line2 grid items-center gap-3.5 border-b px-6 py-[11px]"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="bg-hover h-3 w-10 animate-pulse rounded" />
              <span className="bg-hover h-3 w-3/4 animate-pulse rounded" />
              <span className="bg-hover h-3 w-24 animate-pulse rounded" />
              <span className="bg-hover h-3 w-2/3 animate-pulse rounded" />
              <span className="bg-hover h-3 w-10 animate-pulse rounded" />
              <span className="bg-hover h-4 w-16 animate-pulse justify-self-end rounded-full" />
            </div>
          ))}

        {feed.isError && (
          <p className="text-destructive px-6 py-16 text-center text-[13px]">
            Não foi possível carregar as intimações.
          </p>
        )}

        {!feed.isLoading && !feed.isError && feed.rows.length === 0 && (
          <p className="text-fg3 px-6 py-16 text-center text-[13px]">
            Nenhuma intimação encontrada.
          </p>
        )}

        {!feed.isLoading &&
          feed.rows.map((r) => (
            <Link
              key={r.id}
              href={`/prazos/intimacao/${r.id}`}
              className="hover:bg-hover border-line2 grid w-full items-center gap-3.5 border-b px-6 py-[11px] text-left"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-fg3 font-mono text-[11px]">
                {r.publicado}
              </span>
              <span className="min-w-0 truncate text-[13px] font-medium">
                {r.providencia}
              </span>
              <span className="text-fg2 min-w-0 truncate font-mono text-[11px]">
                {r.cnjCurto}
              </span>
              <span className="text-fg2 min-w-0 truncate text-[12px]">
                {r.origem}
              </span>
              <span
                className="font-mono text-[11px]"
                style={{ color: r.prazoCor }}
              >
                {r.prazoLabel}
              </span>
              <span
                className="border-line justify-self-end rounded-full border px-[9px] py-[3px] text-[11px] font-medium"
                style={{ color: r.statusCor }}
              >
                {r.statusLabel}
              </span>
            </Link>
          ))}

        {feed.hasMore && !feed.isLoading && (
          <button
            type="button"
            onClick={() => feed.loadMore()}
            disabled={feed.isLoadingMore}
            className="border-line bg-panel hover:bg-hover text-fg2 mx-auto my-4 block rounded-lg border px-4 py-2 text-[12px]"
          >
            {feed.isLoadingMore ? "Carregando…" : "Mostrar mais"}
          </button>
        )}
      </div>
    </div>
  );
}
