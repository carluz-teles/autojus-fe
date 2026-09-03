"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/mock-ui/layout";
import {
  corTextoUrgencia,
  corUrgencia,
} from "@/features/intimacoes/components/shared/prazo-urgencia";
import { TYPE_LABEL } from "@/features/intimacoes/lib/labels";
import type { IntimacaoView } from "@/features/intimacoes/types";
import { cn, formatarData } from "@/lib/utils";

import { useTriagem } from "../hooks/use-triagem";
import { prazoAcessivelLabel, prazoRelativoLabel } from "../lib/prazo-relativo";

// ─────────────────────────────────────────────────────────────────────────────
// TriagemView — lista real das intimações que ainda não viraram tarefa
// (work_stage ∈ {RECEIVED, AWAITING_CONFIRMATION, CONFIRMED}), ordenada por
// urgência (client-side, ver useTriagem/ordenarPorUrgencia). Só navegação: cada
// card é um <Link> pra /intimacoes/:id (padrão do app inteiro — nunca
// router.push programático); resolver/ignorar/atribuir ficam de fora (Inbox e
// Pipeline seguem sendo os donos dessas ações).
// ─────────────────────────────────────────────────────────────────────────────

export function TriagemView() {
  const { itens, totalCount, isPending, error } = useTriagem();

  if (isPending) return <TriagemEsqueleto />;

  if (error) {
    return (
      <div className="px-8 pt-8">
        <p role="alert" className="text-destructive text-sm">
          Não foi possível carregar as intimações. Tente novamente.
        </p>
      </div>
    );
  }

  const primeiro = itens[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-8">
      <PageHeader titulo="Triagem">
        <p className="text-muted-foreground mt-1.5 font-mono text-[13.5px]">
          {totalCount} {totalCount === 1 ? "intimação" : "intimações"} a
          analisar
        </p>
      </PageHeader>

      <div className="mt-2 flex-1">
        {itens.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            Nenhuma intimação a triar
          </div>
        ) : (
          <ul>
            {itens.map((item) => (
              <li key={item.id}>
                <LinhaTriagem item={item} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 shrink-0">
        {primeiro ? (
          <Link
            href={`/intimacoes/${primeiro.id}`}
            className="border-border bg-card hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-4 py-2.5 text-[13.5px] font-medium no-underline transition-colors hover:no-underline focus-visible:ring-3 focus-visible:outline-none"
          >
            Analisar
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="border-border bg-card text-muted-foreground inline-flex min-h-10 cursor-not-allowed items-center gap-1.5 rounded-lg border px-4 py-2.5 text-[13.5px] font-medium opacity-50"
          >
            Analisar
            <ArrowRight className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

function LinhaTriagem({ item }: { item: IntimacaoView }) {
  const cor = corUrgencia(item.prazo);
  const corTexto = corTextoUrgencia(item.prazo);
  const prazoLabel = prazoRelativoLabel(item.prazo);
  const prazoAcessivel = prazoAcessivelLabel(item.prazo);
  const selo = item.prazo?.confirmed === true ? "confiável" : "a apurar";

  return (
    <Link
      href={`/intimacoes/${item.id}`}
      aria-label={`Intimação, processo ${item.cnj_number}, ${prazoAcessivel}`}
      style={{ borderLeftColor: cor }}
      className={cn(
        "border-border hover:bg-gold/[0.08] focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-[52px] w-full items-center gap-3 border-b border-l-[3px] px-3 py-3 no-underline transition-colors hover:no-underline focus-visible:z-10 focus-visible:ring-3 focus-visible:outline-none",
      )}
    >
      {/* Indicador de urgência: cor decorativa (aria-hidden) — o texto do prazo à
          direita e o aria-label do link já carregam a mesma informação, então a
          cor nunca é o único sinal (WCAG 1.4.1). */}
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full"
        style={{ background: cor }}
      />

      <span className="min-w-0 flex-1">
        <span className="text-foreground block truncate text-[14px]">
          Intimação · Proc. {item.cnj_number}
        </span>
        <span className="text-muted-foreground mt-0.5 block truncate text-[12px]">
          Publicada {formatarData(item.made_available_at)} ·{" "}
          {TYPE_LABEL[item.type] ?? item.type} · {selo}
        </span>
      </span>

      <span
        className="shrink-0 text-[12.5px] font-medium tabular-nums"
        style={{ color: corTexto }}
      >
        {prazoLabel}
      </span>
    </Link>
  );
}

function TriagemEsqueleto() {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-8 py-8">
      <div className="bg-muted h-9 w-32 animate-pulse rounded" />
      <div className="bg-muted mt-3 h-4 w-56 animate-pulse rounded" />
      <div className="mt-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border-border flex min-h-[52px] items-center gap-3 border-b border-l-[3px] border-l-transparent px-3 py-3"
          >
            <span className="bg-muted size-2 shrink-0 animate-pulse rounded-full" />
            <span className="min-w-0 flex-1">
              <span className="bg-muted block h-3.5 w-48 animate-pulse rounded" />
              <span className="bg-muted mt-1.5 block h-3 w-64 animate-pulse rounded" />
            </span>
            <span className="bg-muted h-3.5 w-16 shrink-0 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
