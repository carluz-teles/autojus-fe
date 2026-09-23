"use client";

// Card de intimação da agenda (Meus Prazos / Fila). A intimação É a tarefa e
// carrega o próprio prazo: mostra "o que aconteceu" (ato/título + processo),
// o prazo com cor de urgência, e as duas ações — Gerar peça (auto=1, fluxo novo)
// e Dar ciência (resolve a intimação). O action_item é só encanamento do "Gerar
// peça" (via recommended_providencia.id) — nunca aparece como "providência".

import { ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useResolverIntimacao } from "@/features/intimacoes/hooks/use-intimacoes";
import { linhaIntimacao } from "@/features/intimacoes/lib/listagem";
import type { IntimacaoView } from "@/features/intimacoes/types";
import { GerarPecaButton } from "@/features/pecas-v2/components/pregen/gerar-peca-button";

function prazoCor(daysLeft: number | null | undefined): string {
  if (daysLeft == null) return "var(--fg3)";
  if (daysLeft < 0) return "var(--red)";
  if (daysLeft === 0) return "var(--gold)";
  if (daysLeft <= 2) return "var(--gold)";
  return "var(--fg2)";
}

export function IntimacaoAgendaCard({
  intimacao,
}: {
  intimacao: IntimacaoView;
}) {
  const row = linhaIntimacao(intimacao);
  const rec = intimacao.recommended_providencia;
  const resolver = useResolverIntimacao();
  const busy = resolver.isPending;
  const cor = prazoCor(intimacao.prazo?.days_left);

  const detalhe = `/intimacoes/${intimacao.id}`;

  return (
    <div className="surface-panel grid grid-cols-1 gap-4 p-4 sm:grid-cols-[1fr_auto] sm:p-5">
      {/* O que aconteceu */}
      <Link href={detalhe} className="group flex min-w-0 flex-col gap-1.5">
        <p className="section-label">O que aconteceu</p>
        <h3 className="font-display truncate text-base leading-snug font-medium group-hover:underline">
          {row.ato !== "Tipo a definir" ? row.ato : row.title}
        </h3>
        <p className="text-muted-foreground truncate text-sm">
          {[row.title, row.tribunal].filter(Boolean).join(" · ")}
        </p>
        <p className="text-fg3 truncate font-mono text-xs">
          {row.cnj}
          {row.partes ? (
            <span className="font-sans"> · {row.partes}</span>
          ) : null}
        </p>
      </Link>

      {/* Prazo + ações */}
      <div className="flex flex-col gap-3 sm:w-52 sm:items-end sm:text-right">
        <div>
          <p className="section-label sm:text-right">Prazo</p>
          <p
            className="text-sm font-medium tabular-nums"
            style={{ color: cor }}
          >
            {row.prazo.data}
          </p>
          <p className="text-muted-foreground text-xs">
            {row.prazo.relative || "sem prazo"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {rec?.gera_peca ? (
            <GerarPecaButton
              intimacaoId={intimacao.id}
              processoId={intimacao.court_record_id}
              actionItemId={rec.id}
              retorno={detalhe}
              degree={intimacao.degree}
              pecaLabel={rec.title ?? row.ato}
            />
          ) : null}
          <Button
            variant={rec?.gera_peca ? "outline" : "default"}
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!busy) resolver.mutate(intimacao.id);
            }}
          >
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Dar ciência
          </Button>
          {!rec ? (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={detalhe} />}
            >
              Abrir
              <ArrowRight data-icon="inline-end" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
