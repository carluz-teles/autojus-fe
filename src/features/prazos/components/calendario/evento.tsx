import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { CalEventoUI } from "../../lib/calendario";

export function EventoCalendario({
  evento: e,
  densidade = "dia",
}: {
  evento: CalEventoUI;
  densidade?: "mes" | "semana" | "dia";
}) {
  const compacto = densidade !== "dia";
  const mensal = densidade === "mes";
  const tipo = e.tipo === "prazo" ? "Prazo" : "Providência";
  const destino = e.tipo === "prazo" ? "Abrir intimação" : "Abrir providência";
  const data = e.dia.split("-").reverse().join("/");
  return (
    <Link
      href={e.href}
      prefetch={false}
      aria-label={`${destino}: ${e.titulo}${e.sub ? ` · ${e.sub}` : ""} · ${data}`}
      title={[
        e.titulo,
        e.processo,
        e.sub,
        `${tipo} · ${e.situacao || ""}`,
        `Vencimento: ${data}`,
        e.contagem,
        e.responsavel,
      ]
        .filter(Boolean)
        .join("\n")}
      className={cn(
        "group border-line bg-panel hover:bg-hover focus-visible:ring-primary block min-w-0 shrink-0 overflow-hidden rounded-md border border-l-[3px] text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        mensal ? "px-1.5 py-1" : compacto ? "px-2 py-1.5" : "p-3",
      )}
      style={{ borderLeftColor: e.urgCor }}
    >
      <span className="flex items-start gap-1">
        <span
          className={cn(
            "min-w-0 flex-1 font-medium break-words",
            mensal
              ? "truncate text-[11px] leading-4"
              : compacto
                ? "line-clamp-2 text-xs"
                : "text-sm",
          )}
        >
          {e.titulo}
        </span>
        <ArrowUpRight
          aria-hidden
          className="text-muted-foreground size-3.5 shrink-0"
        />
      </span>
      {!mensal && e.processo && (
        <span className="text-muted-foreground mt-1 block text-xs break-words">
          {e.processo}
        </span>
      )}
      {e.sub && (
        <span
          className={cn(
            "text-muted-foreground block font-mono text-[10.5px]",
            mensal
              ? "truncate leading-3.5"
              : "mt-1 [overflow-wrap:anywhere] break-words",
          )}
        >
          {e.sub}
        </span>
      )}
      {!mensal && (
        <span className="text-muted-foreground mt-1 block text-[11px]">
          {tipo}
          {e.situacao ? ` · ${e.situacao}` : ""}
        </span>
      )}
      {!mensal && e.contagem && (
        <span className="text-muted-foreground mt-1 block text-[11px]">
          {e.contagem}
        </span>
      )}
      {!mensal && e.responsavel && (
        <span className="text-muted-foreground mt-1 block text-[11px]">
          {e.responsavel}
        </span>
      )}
      {!compacto && (
        <span className="text-muted-foreground mt-1 block text-xs">
          Vencimento: {data}
        </span>
      )}
    </Link>
  );
}
