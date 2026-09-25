"use client";

// BulkBar (sticky) da Triagem-pipeline — barra de ações em lote sobre a seleção
// manual. Extraída do mockup; só as ações que têm mutação REAL ficam ativas.

import { CheckCheck, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type BulkKind = "ciencia" | "responsavel";

export function BulkBar({
  count,
  pending,
  onBulk,
  onClear,
}: {
  count: number;
  pending: boolean;
  onBulk: (kind: BulkKind) => void;
  onClear: () => void;
}) {
  return (
    <div className="sticky top-2 z-30" aria-busy={pending}>
      <div className="border-primary/30 bg-card/95 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          {count} selecionada{count === 1 ? "" : "s"}
        </span>
        {pending ? (
          <span role="status" className="sr-only">
            Processando ações em lote…
          </span>
        ) : null}
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => onBulk("ciencia")}
        >
          <CheckCheck data-icon="inline-start" />
          Dar ciência
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => onBulk("responsavel")}
        >
          <UserRound data-icon="inline-start" />
          Atribuir a mim
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          disabled={pending}
          onClick={onClear}
        >
          <X data-icon="inline-start" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
