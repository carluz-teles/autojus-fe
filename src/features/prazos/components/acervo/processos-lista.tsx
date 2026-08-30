"use client";

import { Search } from "lucide-react";
import Link from "next/link";

import { useAcervoProcessos } from "../../hooks/use-acervo-processos";
import { TableFilter } from "./table-filter";

// Grade das colunas (inline p/ evitar o parser de valores arbitrários do Tailwind
// engasgar com `fr` decimal). Header e linhas compartilham a mesma definição.
// Situação / Processo (cnj + classe) / Assunto / Órgão / Resp. / Última mov.
const COLS = "128px minmax(0,1.4fr) minmax(0,1.3fr) minmax(0,1.1fr) 44px 96px";

const SKELETON_ROWS = Array.from({ length: 8 }, (_, i) => i);

// Acervo · Processos: uma linha por processo (court_record), ligada ao BE real
// (listagem, busca server-side, filtros por faceta e paginação por cursor). Cada
// linha abre o hub do processo. O componente só faz JSX + binding.
export function ProcessosLista() {
  const acervo = useAcervoProcessos();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">Processos · Acervo</span>
        <span className="text-fg3 font-mono text-[11px]">
          {acervo.totalLabel}
        </span>
      </header>

      <div className="border-line flex items-center gap-2 border-b px-4 py-2">
        <div className="border-line bg-panel flex h-8 w-[260px] items-center gap-2 rounded-lg border px-2.5">
          <Search className="text-fg3 size-3.5" />
          <input
            className="flex-1 bg-transparent text-[12.5px] outline-none"
            placeholder="Buscar por nº CNJ…"
            value={acervo.search}
            onChange={(e) => acervo.setSearch(e.target.value)}
          />
        </div>

        <div className="ml-auto">
          <TableFilter groups={acervo.filtros} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="border-line text-fg3 sticky top-0 z-[3] grid gap-3.5 border-b px-6 py-[9px] text-[10.5px] font-medium tracking-[0.05em] uppercase backdrop-blur-[6px] [background:color-mix(in_oklch,var(--bg)_92%,transparent)]"
          style={{ gridTemplateColumns: COLS }}
        >
          <span>Situação</span>
          <span>Processo</span>
          <span>Assunto</span>
          <span>Órgão</span>
          <span>Resp.</span>
          <span className="text-right">Última mov.</span>
        </div>

        {acervo.isLoading &&
          SKELETON_ROWS.map((i) => (
            <div
              key={i}
              className="border-line2 grid items-center gap-3.5 border-b px-6 py-[11px]"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="bg-hover h-3.5 w-20 animate-pulse rounded" />
              <span className="bg-hover h-3.5 w-40 animate-pulse rounded" />
              <span className="bg-hover h-3.5 w-32 animate-pulse rounded" />
              <span className="bg-hover h-3.5 w-28 animate-pulse rounded" />
              <span className="bg-hover size-5 animate-pulse rounded-full" />
              <span className="bg-hover h-3.5 w-16 animate-pulse justify-self-end rounded" />
            </div>
          ))}

        {!acervo.isLoading && acervo.isError && (
          <div className="text-destructive grid place-items-center px-6 py-16 text-center text-[13px]">
            Não foi possível carregar os processos.
          </div>
        )}

        {!acervo.isLoading && !acervo.isError && acervo.rows.length === 0 && (
          <div className="text-fg3 grid place-items-center px-6 py-16 text-center text-[13px]">
            Nenhum processo encontrado.
          </div>
        )}

        {!acervo.isLoading &&
          !acervo.isError &&
          acervo.rows.map((r) => (
            <Link
              key={r.id}
              href={`/prazos/processo/${r.id}`}
              className="hover:bg-hover border-line2 grid items-center gap-3.5 border-b px-6 py-[11px] text-left"
              style={{ gridTemplateColumns: COLS }}
            >
              <span
                className="inline-flex min-w-0 items-center gap-[7px] text-[12px]"
                style={{ color: r.situacaoCor }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: r.situacaoCor }}
                />
                <span className="truncate">{r.situacao}</span>
              </span>
              <span className="min-w-0">
                <span className="text-fg2 block truncate font-mono text-[12px]">
                  {r.cnjCurto}
                </span>
                <span className="text-fg3 block truncate text-[10.5px]">
                  {r.classe} · {r.grau}
                </span>
              </span>
              <span className="text-fg2 min-w-0 truncate text-[12px]">
                {r.assunto}
              </span>
              <span className="text-fg2 min-w-0 truncate text-[12px]">
                {r.orgao}
              </span>
              <span className="min-w-0" title={r.resp}>
                <span className="border-line text-fg3 grid size-5 place-items-center rounded-full border text-[8.5px]">
                  {r.respIniciais}
                </span>
              </span>
              <span className="text-fg3 justify-self-end font-mono text-[11.5px]">
                {r.ultimaMov}
              </span>
            </Link>
          ))}

        {!acervo.isLoading && !acervo.isError && acervo.hasMore && (
          <button
            onClick={acervo.loadMore}
            disabled={acervo.isLoadingMore}
            className="border-line bg-panel hover:bg-hover text-fg2 mx-auto my-4 block rounded-lg border px-4 py-2 text-[12px]"
          >
            {acervo.isLoadingMore ? "Carregando…" : "Mostrar mais"}
          </button>
        )}
      </div>
    </div>
  );
}
