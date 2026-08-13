"use client";

import { Timer } from "lucide-react";

import { ApiError } from "@/lib/api/errors";

import { usePrazosDoProcesso } from "../hooks/use-prazos-do-processo";
import { PrazoCard, PrazoCardSkeleton } from "./prazo-card";

// Aba "Prazos" do processo: herói "próximo prazo" + demais VIVOS; os terminais
// (MISSED/MET/CANCELLED) vão num "Histórico" recolhido (evita poluir com os prazos
// já vencidos vindos do backfill histórico). Só JSX + binding — lógica no hook.
export function ProcessoPrazos({ processoId }: { processoId: string }) {
  const {
    proximoPrazo,
    liveRestantes,
    historico,
    isEmpty,
    isPending,
    isError,
    error,
  } = usePrazosDoProcesso(processoId);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <PrazoCardSkeleton />
        <PrazoCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="border-destructive/30 bg-destructive/[0.03] text-destructive rounded-xl border px-4 py-6 text-center text-sm">
        {error instanceof ApiError
          ? error.message
          : "Erro ao carregar os prazos."}
      </p>
    );
  }

  if (isEmpty) {
    return (
      <div className="text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
        <Timer className="size-5 opacity-60" />
        <span className="max-w-xs">
          Nenhum prazo em aberto — os prazos nascem das intimações.
        </span>
      </div>
    );
  }

  const semVivos = !proximoPrazo && liveRestantes.length === 0;

  return (
    <div className="flex flex-col gap-3">
      {proximoPrazo ? <PrazoCard prazo={proximoPrazo} featured /> : null}
      {liveRestantes.map((p) => (
        <PrazoCard key={p.id} prazo={p} />
      ))}

      {semVivos ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-5 text-center text-sm">
          Nenhum prazo em aberto — só encerrados no histórico abaixo.
        </p>
      ) : null}

      {historico.length > 0 ? (
        <details className="group rounded-xl border">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm select-none">
            <span>Histórico — {historico.length} prazo(s) encerrado(s)</span>
            <span className="text-xs transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="flex flex-col gap-3 px-3 pt-1 pb-3">
            {historico.map((p) => (
              <PrazoCard key={p.id} prazo={p} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
