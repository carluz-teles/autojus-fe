"use client";

import Link from "next/link";

import { STATUS_PILL } from "@/features/tasks/lib/status-pill";
import { cn } from "@/lib/utils";

import { type FilaItem, usePrazosFila } from "../../hooks/use-prazos-fila";
import { PrioIcon } from "../icons";

// Fila / Meus Prazos: a lista de trabalho em 3 faixas de prioridade (Vencidos /
// Esta semana / Depois), ligada a GET /v1/tasks. "Meus Prazos" passa meus=true
// (trava assignee="me", resolvido pelo BE; esconde as pílulas de filtro).
export function FilaView({ meus, titulo }: { meus?: boolean; titulo: string }) {
  const fila = usePrazosFila(meus);

  return (
    <div className="text-foreground flex min-h-0 min-w-0 flex-1 flex-col text-[13px]">
      <header className="border-line flex h-11 shrink-0 items-center gap-2.5 border-b px-4">
        <span className="text-[13px] font-medium">{titulo}</span>
        <span className="text-fg3 font-mono text-[11px]">{fila.total}</span>
      </header>

      {fila.podeFiltroResp ? (
        <div className="border-line flex shrink-0 flex-wrap items-center gap-1.5 border-b px-6 py-3">
          <span className="text-fg3 mr-1 text-[11px]">Responsável</span>
          {fila.filtros.map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className="rounded-full border px-[11px] py-[5px] text-[11.5px] font-medium"
              style={{ borderColor: f.borda, background: f.bg, color: f.fg }}
            >
              {f.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto px-6 pb-10">
        {fila.isLoading ? (
          <div className="pt-3.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="border-line2 grid w-full grid-cols-[16px_minmax(0,1fr)_160px_96px_22px] items-center gap-3.5 border-b px-2 py-[11px]"
              >
                <span className="bg-hover size-3.5 animate-pulse rounded" />
                <span className="bg-hover h-3.5 w-40 animate-pulse rounded" />
                <span className="bg-hover h-3.5 w-24 animate-pulse rounded" />
                <span className="bg-hover h-3.5 w-16 animate-pulse rounded" />
                <span className="bg-hover size-[22px] animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : fila.isError ? (
          <div className="text-destructive py-16 text-center text-[12.5px]">
            Não foi possível carregar a fila. Tente novamente.
          </div>
        ) : fila.grupos.length === 0 ? (
          <div className="text-fg3 py-16 text-center text-[12.5px]">
            Nada na fila — tudo em dia. 🎉
          </div>
        ) : (
          fila.grupos.map((g) => (
            <div key={g.label}>
              <div className="sticky top-0 z-[3] flex items-center gap-2 px-0.5 pt-3.5 pb-2 backdrop-blur-[6px] [background:color-mix(in_oklch,var(--bg)_92%,transparent)]">
                <PrioIcon k={g.prioK} />
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: g.cor }}
                >
                  {g.label}
                </span>
                <span className="text-fg3 font-mono text-[11px]">{g.n}</span>
              </div>
              {g.itens.map((it) => (
                <FilaRow key={it.id} it={it} />
              ))}
              {g.temExtra ? (
                <div className="text-fg3 px-2 py-2.5 text-[11.5px]">
                  +{g.extra} mais nesta faixa
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const rowClass =
  "grid w-full grid-cols-[16px_minmax(0,1fr)_160px_96px_22px] items-center gap-3.5 border-b px-2 py-[11px] text-left";

function FilaRow({ it }: { it: FilaItem }) {
  const secundaria = [it.court, it.cnjCurto].filter(Boolean).join(" · ");

  const conteudo = (
    <>
      <PrioIcon k={it.urgK} size={13} />
      <span className="min-w-0">
        <span className="block truncate text-[13.5px] font-medium">
          {it.providencia}
        </span>
        {secundaria ? (
          <span className="text-fg3 block truncate text-[11.5px]">
            {secundaria}
          </span>
        ) : null}
      </span>
      {it.displayStatus ? (
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2 py-px text-[11px]",
            STATUS_PILL[it.displayStatus] ?? "bg-muted text-muted-foreground",
          )}
        >
          {it.displayStatus}
        </span>
      ) : (
        <span />
      )}
      <span className="font-mono text-[12px]" style={{ color: it.urgCor }}>
        {it.prazoLabel}
      </span>
      <span
        className="border-line text-fg3 grid size-[22px] place-items-center rounded-full border text-[8.5px]"
        title={it.respLabel}
      >
        {it.respIniciais}
      </span>
    </>
  );

  if (it.clickable) {
    return (
      <Link
        href={it.href}
        className={cn(rowClass, "border-line2 hover:bg-hover")}
      >
        {conteudo}
      </Link>
    );
  }

  return <div className={cn(rowClass, "border-line2")}>{conteudo}</div>;
}
