"use client";

// BulkBar (sticky) da Triagem-pipeline — barra de ações em lote sobre a seleção
// manual. Extraída do mockup; agora só as ações que têm mutação REAL ficam ativas.
// "Adiar" fica desabilitado (sem endpoint) — ver TODO na view.

import { Check, CheckCheck, Clock, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export type BulkKind = "ciencia" | "confirmar" | "responsavel" | "adiar";

export function BulkBar({
  count,
  onBulk,
  onClear,
  adiarDisponivel = false,
}: {
  count: number;
  onBulk: (kind: BulkKind) => void;
  onClear: () => void;
  /** false = sem endpoint real; o botão fica desabilitado ("em breve"). */
  adiarDisponivel?: boolean;
}) {
  return (
    <div className="sticky top-2 z-30">
      <div className="border-primary/30 bg-card/95 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-lg backdrop-blur">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums">
          {count} selecionada{count === 1 ? "" : "s"}
        </span>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button size="sm" variant="outline" onClick={() => onBulk("ciencia")}>
          <CheckCheck data-icon="inline-start" />
          Dar ciência
        </Button>
        <Button size="sm" variant="outline" onClick={() => onBulk("confirmar")}>
          <Check data-icon="inline-start" />
          Confirmar prazos
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onBulk("responsavel")}
        >
          <UserRound data-icon="inline-start" />
          Atribuir a mim
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!adiarDisponivel}
          title={adiarDisponivel ? undefined : "em breve"}
          onClick={() => adiarDisponivel && onBulk("adiar")}
        >
          <Clock data-icon="inline-start" />
          Adiar
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onClear}>
          <X data-icon="inline-start" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
