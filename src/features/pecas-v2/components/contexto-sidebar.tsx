"use client";

// Coluna esquerda da tela de Construção — fiel aos prints 1/2/4.
// Ordem: Contexto (título + processo) → Prazo → Intimação → Teor → Processo →
// Partes → Providências → Anexos.

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

import type { Draft, DraftDeadline, DraftParty } from "../types";

export function ContextoSidebar({ draft }: { draft: Draft }) {
  return (
    <aside className="border-border w-[300px] shrink-0 overflow-y-auto border-r px-4 py-6">
      <Rotulo>Contexto</Rotulo>
      <p className="font-display mt-1 text-[22px] leading-tight">
        {draft.title}
      </p>
      <p className="text-muted-foreground mt-1 font-mono text-[11.5px] tabular-nums">
        {draft.process.cnj}
      </p>

      <Prazo prazo={draft.deadline} />

      <Rotulo className="mt-6">Intimação de origem</Rotulo>
      <Link
        href={`/intimacoes/${draft.intimation.id}`}
        className="block no-underline hover:no-underline"
      >
        <span className="text-primary inline-flex items-center gap-1.5 text-[13px] font-medium">
          {draft.intimation.title}
          <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
        </span>
        <span className="text-muted-foreground mt-0.5 block text-[11.5px]">
          Intimação · publicada em {draft.intimation.publishedAt}
        </span>
      </Link>

      <Rotulo className="mt-4">Teor da publicação</Rotulo>
      <div className="border-border text-muted-foreground max-h-40 overflow-y-auto border-l-2 pl-2.5 text-[11.5px] leading-[1.6]">
        {draft.intimation.teor}
      </div>

      <Rotulo className="mt-6">Processo</Rotulo>
      <Link
        href={`/processos/${encodeURIComponent(draft.process.cnj)}`}
        className="mb-2 inline-flex items-center gap-1.5 text-[12.5px] tabular-nums"
      >
        {draft.process.cnj}
        <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
      </Link>
      <Campo rotulo="Classe" valor={draft.process.classe} />
      <Campo rotulo="Assunto" valor={draft.process.assunto} />
      <Campo rotulo="Órgão" valor={draft.process.orgao} />
      <Campo rotulo="Tribunal · grau" valor={draft.process.tribunalGrau} />
      {draft.process.valor ? (
        <Campo rotulo="Valor da causa" valor={draft.process.valor} />
      ) : null}
      <Campo rotulo="Distribuição" valor={draft.process.distribuicao} />

      <Rotulo className="mt-6">Partes</Rotulo>
      <Partes parties={draft.parties} />

      <Rotulo className="mt-6">Providências</Rotulo>
      <div className="flex flex-col gap-1.5">
        {draft.providences.map((p) => (
          <div
            key={p.code}
            className="flex gap-2 py-1 text-[12.5px] leading-[1.35]"
          >
            <span className="text-[var(--gold)]">•</span>
            <div className="min-w-0 flex-1">
              <span className="block">{p.title}</span>
              <Link
                href={`/tarefas?task=${p.code}`}
                className="text-primary mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] no-underline hover:no-underline"
              >
                {p.code} · {p.origin === "sugerida" ? "Sugerida" : "Manual"}
                <ArrowUpRight className="size-2.5" strokeWidth={2.4} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      <Rotulo className="mt-6">Anexos</Rotulo>
      <div className="flex flex-col gap-2">
        {draft.attachments.map((a) => (
          <div
            key={a.id}
            className="border-border flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs"
          >
            <span className="truncate">{a.name}</span>
            <span className="text-muted-foreground shrink-0">
              {a.sizeLabel}
            </span>
          </div>
        ))}
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted/40 rounded-lg px-3 py-2 text-left text-[12px] font-medium transition-colors"
        >
          + Anexar documento
        </button>
      </div>
    </aside>
  );
}

// ── Prazo com cor por urgência ──────────────────────────────────────────────

function Prazo({ prazo }: { prazo: DraftDeadline }) {
  const { color, label } = prazoDisplay(prazo);
  return (
    <div className="mt-6">
      <Rotulo>Prazo</Rotulo>
      <p className="font-display mt-1 text-xl tabular-nums" style={{ color }}>
        {prazo.endDate}
      </p>
      <p className="mt-0.5 text-[11.5px]" style={{ color }}>
        {label}
      </p>
    </div>
  );
}

function prazoDisplay(prazo: DraftDeadline): { color: string; label: string } {
  const d = prazo.daysLeft;
  if (d < 0) {
    return {
      color: "var(--destructive)",
      label: `${Math.abs(d)} · dias em atraso`,
    };
  }
  if (d === 0) {
    return { color: "var(--destructive)", label: "0 · vence hoje" };
  }
  if (d <= 3) {
    return { color: "var(--gold)", label: `${d} · dias restantes` };
  }
  return {
    color: "var(--muted-foreground)",
    label: `${d} · dias restantes`,
  };
}

// ── Partes ──────────────────────────────────────────────────────────────────

function Partes({ parties }: { parties: DraftParty[] }) {
  const autor = parties.find((p) => p.role === "autor");
  const reu = parties.find((p) => p.role === "reu");
  const procuradores = parties.filter((p) => p.role === "procurador");

  return (
    <>
      {autor && <ParteBloco rotulo="Autor" primary={autor.name} />}
      {reu && <ParteBloco rotulo="Réu" primary={reu.name} />}
      {procuradores.length > 0 && (
        <div className="border-border border-b py-1.5">
          <span className="text-muted-foreground block text-[11px]">
            Procuradores
          </span>
          {procuradores.map((p) => (
            <span
              key={`${p.name}-${p.detail ?? ""}`}
              className="mt-0.5 block text-xs"
            >
              {p.name}
              {p.detail ? (
                <span className="text-muted-foreground"> · {p.detail}</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function ParteBloco({ rotulo, primary }: { rotulo: string; primary: string }) {
  return (
    <div className="border-border border-b py-1.5">
      <span className="text-muted-foreground block text-[11px]">{rotulo}</span>
      <span className="mt-0.5 block text-xs">{primary}</span>
    </div>
  );
}

// ── Primitives ──────────────────────────────────────────────────────────────

function Rotulo({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mb-1.5 text-[10.5px] tracking-[0.12em] uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="border-border flex justify-between gap-2.5 border-b py-1.5 text-xs">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="text-right">{valor}</span>
    </div>
  );
}
