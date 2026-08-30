"use client";

import Link from "next/link";

import { useAcervoProcessos } from "../../hooks/use-acervo-processos";
import { PrioIcon, StatusIcon } from "../icons";

// Grade das colunas (inline p/ evitar o parser de valores arbitrários do Tailwind
// engasgar com `fr` decimal). Header e linhas compartilham a mesma definição.
const COLS = "132px minmax(0,1.6fr) 118px minmax(0,1.1fr) 40px 96px";

// Acervo · Processos: uma linha por processo (agrupado por CNJ), fiel ao
// template (linhas 1120-1190). Colunas: Etapa / Cliente / Classe / Órgão /
// Resp. / Próximo prazo. Cada linha abre o hub do processo.
export function ProcessosLista() {
  const acervo = useAcervoProcessos();

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">Processos · Acervo</span>
        <span className="text-fg3 font-mono text-[11px]">{acervo.total}</span>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div
          className="border-line text-fg3 sticky top-0 z-[3] grid gap-3.5 border-b px-6 py-[9px] text-[10.5px] font-medium tracking-[0.05em] uppercase backdrop-blur-[6px] [background:color-mix(in_oklch,var(--bg)_92%,transparent)]"
          style={{ gridTemplateColumns: COLS }}
        >
          <span>Etapa</span>
          <span>Cliente</span>
          <span>Classe</span>
          <span>Órgão</span>
          <span>Resp.</span>
          <span className="text-right">Prazo</span>
        </div>

        {acervo.rows.map((r) => (
          <Link
            key={r.cnj}
            href={`/prazos/processo/${encodeURIComponent(r.cnj)}`}
            className="hover:bg-hover border-line2 grid items-center gap-3.5 border-b px-6 py-[11px] text-left"
            style={{ gridTemplateColumns: COLS }}
          >
            <span className="text-fg2 inline-flex min-w-0 items-center gap-[7px] text-[12px]">
              <StatusIcon k={r.faseK} size={13} />
              <span className="truncate">{r.faseLabel}</span>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">
                {r.cliente}
              </span>
              <span className="text-fg3 block truncate font-mono text-[10.5px]">
                {r.cnjCurto}
              </span>
            </span>
            <span className="text-fg2 min-w-0 truncate text-[12px]">
              {r.classe}
            </span>
            <span className="text-fg2 min-w-0 truncate text-[12px]">
              {r.orgao}
            </span>
            <span className="min-w-0">
              <span className="border-line text-fg3 grid size-5 place-items-center rounded-full border text-[8.5px]">
                {r.respIniciais}
              </span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 justify-self-end font-mono text-[11.5px]"
              style={{ color: r.urgCor }}
            >
              <PrioIcon k={r.urgK} size={13} />
              {r.prazoCurto}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
