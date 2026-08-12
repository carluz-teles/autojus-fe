"use client";

import { Timer } from "lucide-react";

import { ApiError } from "@/lib/api/errors";

import { usePrazosDoProcesso } from "../hooks/use-prazos-do-processo";
import { PrazoCard, PrazoCardSkeleton } from "./prazo-card";

// Aba "Prazos" do processo: herói "próximo prazo" no topo + lista dos demais.
// Só JSX + binding — a leitura e a escolha do herói vivem no hook.
export function ProcessoPrazos({ processoId }: { processoId: string }) {
  const { prazos, proximoPrazo, isPending, isError, error } =
    usePrazosDoProcesso(processoId);

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

  if (prazos.length === 0) {
    return (
      <div className="text-muted-foreground flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center text-sm">
        <Timer className="size-5 opacity-60" />
        <span className="max-w-xs">
          Nenhum prazo em aberto — os prazos nascem das intimações.
        </span>
      </div>
    );
  }

  const restantes = proximoPrazo
    ? prazos.filter((p) => p.id !== proximoPrazo.id)
    : prazos;

  return (
    <div className="flex flex-col gap-3">
      {proximoPrazo ? <PrazoCard prazo={proximoPrazo} featured /> : null}
      {restantes.map((p) => (
        <PrazoCard key={p.id} prazo={p} />
      ))}
    </div>
  );
}
