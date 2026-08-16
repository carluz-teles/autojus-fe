"use client";

import { Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PrazoView } from "@/features/prazos/types";
import { cn } from "@/lib/utils";

// Barra de alertas (§7): aparece SÓ quando há prazo crítico/próximo. O tom vem de
// days_left — vermelho (destructive) quando vencido/hoje, latão (gold) quando ≤ 3
// dias. Acima disso não renderiza nada. Ações no-op nesta fase. Só JSX + binding.

function severidade(daysLeft: number): "critico" | "urgente" | null {
  if (daysLeft <= 0) return "critico";
  if (daysLeft <= 3) return "urgente";
  return null;
}

function resumo(daysLeft: number): string {
  if (daysLeft < 0) {
    const abs = Math.abs(daysLeft);
    return `Prazo vencido há ${abs} dia${abs === 1 ? "" : "s"} e ainda em aberto.`;
  }
  if (daysLeft === 0) return "Prazo vence hoje.";
  return `Prazo vence em ${daysLeft} dia${daysLeft === 1 ? "" : "s"}.`;
}

export function AlertBar({ proximoPrazo }: { proximoPrazo: PrazoView | null }) {
  if (!proximoPrazo) return null;
  const sev = severidade(proximoPrazo.days_left);
  if (!sev) return null;

  const critico = sev === "critico";

  return (
    <div
      role="alert"
      className={cn(
        "reveal flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3",
        critico
          ? "border-destructive/30 bg-destructive/[0.06]"
          : "border-gold/40 bg-gold/[0.07]",
      )}
    >
      <TriangleAlert
        className={cn(
          "size-5 shrink-0",
          critico ? "text-destructive" : "text-gold",
        )}
      />
      <p className="min-w-0 flex-1 text-sm font-medium">
        {resumo(proximoPrazo.days_left)}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {proximoPrazo.intimation_id ? (
          <Button
            size="sm"
            variant="outline"
            render={<Link href={`/intimacoes/${proximoPrazo.intimation_id}`} />}
          >
            Abrir intimação
          </Button>
        ) : null}
        <Button size="sm" disabled>
          <Sparkles data-icon="inline-start" /> Gerar manifestação
        </Button>
      </div>
    </div>
  );
}
