"use client";

import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

import { Button } from "./button";

export interface Coluna {
  label: string;
  /** Largura explícita sempre — nenhuma coluna fica "auto". */
  largura: string;
  alinhamento?: "left" | "right";
}

export interface Linha {
  id: string;
  /** Ponto de urgência na primeira coluna. */
  tom?: string;
  href?: string;
  celulas: React.ReactNode[];
}

export function DataTable({
  colunas,
  linhas,
  larguraMinima,
  rodape,
  vazioTexto = "Nenhum resultado com os filtros aplicados.",
  onLimpar,
}: {
  colunas: Coluna[];
  linhas: Linha[];
  larguraMinima: string;
  rodape?: string;
  vazioTexto?: string;
  onLimpar?: () => void;
}) {
  const router = useRouter();

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-xl bg-card ring-hairline">
        <table
          className="w-full table-fixed border-collapse text-[13.5px]"
          style={{ minWidth: larguraMinima }}
        >
          <thead>
            <tr className="h-11 border-b border-border">
              <th className="w-7 px-2" />
              {colunas.map((c) => (
                <th
                  key={c.label}
                  style={{ width: c.largura }}
                  className={cn(
                    "px-5 py-3 text-[11px] font-medium tracking-[0.06em] uppercase text-muted-foreground",
                    c.alinhamento === "right" ? "text-right" : "text-left",
                  )}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={colunas.length + 1} className="p-0">
                  <div className="px-6 py-12 text-center text-muted-foreground">
                    <p className="text-sm">{vazioTexto}</p>
                    {onLimpar && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={onLimpar}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              linhas.map((l) => (
                <tr
                  key={l.id}
                  onClick={l.href ? () => router.push(l.href!) : undefined}
                  className={cn(
                    "h-16 border-b border-border last:border-0 hover:bg-muted",
                    l.href && "cursor-pointer",
                  )}
                >
                  <td className="px-2 align-middle">
                    {l.tom && (
                      <span
                        className="mx-auto block size-2 rounded-full"
                        style={{ background: l.tom }}
                      />
                    )}
                  </td>
                  {l.celulas.map((celula, i) => (
                    <td
                      key={i}
                      className={cn(
                        "overflow-hidden px-5 py-3.5 align-middle",
                        colunas[i]?.alinhamento === "right" && "text-right",
                      )}
                    >
                      {celula}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {linhas.length > 0 && rodape && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-[13px] tabular-nums text-muted-foreground">
            {rodape}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <span className="text-[12.5px] tabular-nums text-muted-foreground">
              Página 1
            </span>
            <Button variant="outline" size="sm">
              Próxima
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/** Célula de duas linhas: valor forte + apoio. */
export function CelulaDupla({
  principal,
  apoio,
  cor,
  numerico,
}: {
  principal: string;
  apoio?: string;
  cor?: string;
  numerico?: boolean;
}) {
  return (
    <span className="block">
      <span
        className={cn("block truncate font-medium", numerico && "tabular-nums")}
        style={cor ? { color: cor } : undefined}
      >
        {principal}
      </span>
      {apoio && (
        <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground">
          {apoio}
        </span>
      )}
    </span>
  );
}
