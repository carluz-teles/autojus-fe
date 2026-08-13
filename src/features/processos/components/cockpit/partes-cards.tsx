"use client";

import { Scale, UserRound, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import { useProcessoPartes } from "../../hooks/use-processo-partes";
import type { Party } from "../../types";

// Cards AUTOR / RÉU (§ partes): o polo ativo e o passivo do processo, cada parte
// com seu nome, documento (quando houver) e advogado(s) com OAB/UF. Dado real de
// GET /v1/processos/:id/partes. Polo vazio → estado discreto "sem partes
// identificadas ainda" (o card não some). Só JSX + binding; o fetch mora no hook.
export function PartesCards({ processoId }: { processoId: string }) {
  const { autor, reu, isPending, isError } = useProcessoPartes(processoId);

  if (isPending) {
    return (
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PoloSkeleton />
        <PoloSkeleton />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PoloCard
        icon={UserRound}
        label="Autor"
        tone="text-emerald-700 dark:text-emerald-400"
        partes={autor}
        isError={isError}
      />
      <PoloCard
        icon={Scale}
        label="Réu"
        tone="text-destructive"
        partes={reu}
        isError={isError}
      />
    </section>
  );
}

function PoloCard({
  icon: Icon,
  label,
  tone,
  partes,
  isError,
}: {
  icon: typeof UserRound;
  label: string;
  tone: string;
  partes: Party[];
  isError: boolean;
}) {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "bg-muted/60 flex size-7 items-center justify-center rounded-lg",
            tone,
          )}
        >
          <Icon className="size-4" />
        </span>
        <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          {label}
        </h3>
        {partes.length > 1 ? (
          <span className="text-muted-foreground/70 text-xs tabular-nums">
            {partes.length}
          </span>
        ) : null}
      </div>

      {partes.length === 0 ? (
        <p className="text-muted-foreground/70 text-sm">
          {isError
            ? "Não foi possível carregar as partes."
            : "Sem partes identificadas ainda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {partes.map((p, i) => (
            <li key={`${p.name}-${i}`} className="flex flex-col gap-1">
              <p className="text-sm leading-tight font-medium">{p.name}</p>
              {p.document ? (
                <p className="text-muted-foreground text-xs tabular-nums">
                  {p.document}
                </p>
              ) : null}
              {p.counsels.length > 0 ? (
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {p.counsels.map((c, j) => (
                    <li
                      key={`${c.oab}-${j}`}
                      className="text-muted-foreground flex items-center gap-1.5 text-xs"
                    >
                      <Users className="size-3 shrink-0" />
                      <span className="min-w-0 truncate">{c.name}</span>
                      {c.oab ? (
                        <span className="text-muted-foreground/70 shrink-0 tabular-nums">
                          OAB {c.oab}
                          {c.uf ? `/${c.uf}` : ""}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PoloSkeleton() {
  return (
    <div className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-5 shadow-sm ring-1">
      <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      <div className="bg-muted h-4 w-40 animate-pulse rounded" />
      <div className="bg-muted h-3 w-28 animate-pulse rounded" />
    </div>
  );
}
