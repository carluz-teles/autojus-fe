"use client";

import Link from "next/link";

import { useAcervoIntimacoes } from "../../hooks/use-acervo-intimacoes";
import { OrigemIcon } from "../icons";

// Grade das colunas (inline p/ evitar o parser de valores arbitrários do Tailwind
// engasgar com `fr` decimal). Header e linhas compartilham a mesma definição.
const COLS = "78px minmax(0,1.5fr) minmax(0,1fr) 120px 110px";

// Acervo · Intimações (feed do DJEN): uma linha por publicação, fiel ao
// template (linhas 1191-1261). Colunas: Publicado / Providência / Cliente /
// Origem / Status. Cada linha abre o detalhe da intimação.
export function IntimacoesFeed() {
  const feed = useAcervoIntimacoes();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">Intimações · Feed</span>
        <span className="text-fg3 font-mono text-[11px]">{feed.total}</span>
        <span className="text-fg3 ml-auto text-[11.5px]">
          Tudo que chegou — inclusive sem prazo. A Inbox puxa daqui o que
          precisa de triagem.
        </span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div
          className="border-line text-fg3 sticky top-0 z-[3] grid gap-3.5 border-b px-6 py-[9px] text-[10.5px] font-medium tracking-[0.05em] uppercase backdrop-blur-[6px] [background:color-mix(in_oklch,var(--bg)_92%,transparent)]"
          style={{ gridTemplateColumns: COLS }}
        >
          <span>Publicado</span>
          <span>Providência</span>
          <span>Cliente</span>
          <span>Origem</span>
          <span className="text-right">Status</span>
        </div>

        {feed.rows.map((r) => (
          <Link
            key={r.id}
            href={`/prazos/intimacao/${r.id}`}
            className="hover:bg-hover border-line2 grid w-full items-center gap-3.5 border-b px-6 py-[11px] text-left"
            style={{ gridTemplateColumns: COLS }}
          >
            <span className="text-fg3 font-mono text-[11px]">
              {r.publicacao}
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium">
              {r.providencia}
            </span>
            <span className="text-fg2 min-w-0 truncate text-[12px]">
              {r.cliente}
            </span>
            <span
              className="inline-flex items-center gap-1.5 justify-self-start rounded-md px-2 py-[3px] text-[11px] font-medium"
              style={{ background: r.origemFundo, color: r.origemCor }}
            >
              <OrigemIcon origem={r.origem} cor={r.origemCor} size={11} />
              {r.origemLabel}
            </span>
            <span className="border-line text-fg2 justify-self-end rounded-full border px-[9px] py-[3px] text-[11px] font-medium">
              {r.statusLabel}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
