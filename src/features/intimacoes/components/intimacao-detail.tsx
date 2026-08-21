"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgMembersDirectory } from "@/features/organization/hooks/use-org-members-directory";
import { ConfirmarPrazo } from "@/features/prazos/components/confirmar-prazo";
import { cn, formatarData } from "@/lib/utils";

import {
  useAssignIntimacaoResponsaveis,
  useIntimacaoDetalhe,
} from "../hooks/use-intimacoes";
import { tituloIntimacao } from "../lib/titulo";
import type { IntimacaoDetalheView, IntimacaoPrazoView } from "../types";
import { AnalisarCard } from "./shared/analisar-card";
import { Avatar, initials } from "./shared/avatar";
import { EyebrowTitle } from "./shared/eyebrow-title";
import { PrazoContagemGrande } from "./shared/prazo-contagem-grande";
import { TeorPublicacao } from "./shared/teor-publicacao";

// ─────────────────────────────────────────────────────────────────────────────
// IntimacaoDetail — tela de detalhe da intimação (/intimacoes/[id]).
// Layout coluna única, pixel-perfect ao design de referência. Dados reais vêm
// de useIntimacaoDetalhe(id) + <ConfirmarPrazo/>; blocos ainda sem feature são
// MOCK (marcados abaixo). O CNJ é o H1 (decisão do PO).
// ─────────────────────────────────────────────────────────────────────────────

export function IntimacaoDetail({ id }: { id: string }) {
  const { data: i, isPending, error } = useIntimacaoDetalhe(id);

  // Breadcrumb padrão publicado no header sticky do AppShell (NÃO dentro da página).
  const crumbs = useMemo(
    () =>
      i
        ? [
            { label: "Intimações", href: "/intimacoes" },
            { label: i.cnj_number },
          ]
        : undefined,
    [i],
  );
  useSetBreadcrumb(crumbs);

  if (isPending) return <Skeleton />;

  if (error || !i) {
    return (
      <div className="p-8" role="alert">
        <p className="text-destructive text-sm">
          Não foi possível carregar esta intimação. Tente novamente.
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 pt-4 pb-16">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[10.5px] font-medium tracking-[0.14em] uppercase">
            Intimação · {i.court}
          </p>
          <h1 className="font-display text-foreground mt-2 text-[32px] leading-[1.1] font-normal text-pretty">
            {tituloIntimacao(i)}
          </h1>
          <p className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]">
            <span>publicado em {formatarData(i.published_at)} ·</span>
            <Link
              href={`/processos/${encodeURIComponent(i.court_record_id)}`}
              className="text-primary inline-flex items-center gap-0.5 tabular-nums transition-colors hover:opacity-80"
            >
              {i.cnj_number}
              <ArrowUpRight className="size-3" strokeWidth={2.2} />
            </Link>
          </p>
        </div>

        {/* MOCK: peticionamento — ações ainda não implementadas */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Button variant="outline" onClick={emBreve}>
            Sem providência
          </Button>
          <Button onClick={emBreve}>Redigir peça</Button>
        </div>
      </header>

      {/* ── 3. Régua ── */}
      <hr className="border-border/70 mt-8 mb-8 border-t" />

      {/* ── 4. Barra-herói do prazo ── */}
      <PrazoHero prazo={i.prazo} />

      {/* ── 5. Painel de PRAZO (feature prazos, reutilizado) ── */}
      <div className="mt-8">
        <ConfirmarPrazo intimationId={i.id} />
      </div>

      {/* ── 6. Corpo em 2 colunas ── */}
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Coluna central */}
        <div className="min-w-0">
          {/* Card: Analisar esta intimação (IA) — pré vs pós-análise. REAL. */}
          <AnalisarCard intimacao={i} />

          {/* Peças desta intimação — MOCK: peticionamento */}
          <PecasSection />

          {/* Teor da publicação — REAL (HTML sanitizado) */}
          <TeorPublicacao content={i.content} />
        </div>

        {/* Coluna lateral */}
        <aside className="flex min-w-0 flex-col gap-4">
          <ResponsaveisCard intimacao={i} />
          <HistoricoCard intimacao={i} />
        </aside>
      </div>
    </div>
  );
}

// ─── helpers de UI compartilhados ─────────────────────────────────────────────

/** MOCK: features de IA/peticionamento ainda não existem — feedback consistente. */
function emBreve() {
  toast("Em breve.");
}

// ─── 4. Barra-herói do prazo (REAL, derivada de i.prazo) ─────────────────────

function PrazoHero({ prazo }: { prazo: IntimacaoPrazoView | null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-8">
      <PrazoContagemGrande prazo={prazo} />

      {/* Status de peça/assinatura/protocolo — MOCK: peticionamento */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <StatusColuna label="Peça" value="Rascunho" tone="gold" />
        <StatusColuna label="Assinatura" value="Pendente" />
        <StatusColuna label="Protocolo" value="Não iniciado" />
      </div>
    </div>
  );
}

/** Uma coluna do trio de status (rótulo uppercase muted + valor). tone="gold"
 * pinta o valor em âmbar (o "Rascunho"). MOCK: peticionamento. */
function StatusColuna({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-[10.5px] font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-[13px]",
          tone === "gold"
            ? "font-medium text-[var(--gold-foreground)]"
            : "text-foreground/80",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── 6b. Teor da publicação — REAL (HTML sanitizado) ─────────────────────────
// TeorPublicacao movido para shared/teor-publicacao.tsx (Regra nº1): reutilizado
// também pelo PainelDetalhe do master-detail compacto (com borderColor="gold" e
// collapsedHeight=180). A tela full usa os defaults ("border", 260px).

// ─── 6c. Peças desta intimação (MOCK: peticionamento) ────────────────────────

function PecasSection() {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <EyebrowTitle>Peças desta intimação</EyebrowTitle>
        <button
          type="button"
          onClick={emBreve}
          className="text-primary text-[12.5px] font-medium transition-colors hover:opacity-80"
        >
          + Nova peça
        </button>
      </div>

      {/* MOCK: peticionamento — uma peça exemplo */}
      <button
        type="button"
        onClick={emBreve}
        className="border-border hover:bg-muted/40 mt-3 flex w-full items-center gap-3 border-t py-3.5 text-left transition-colors"
      >
        <span className="text-foreground text-[14px]">
          Manifestação sobre cálculo
        </span>
        <span className="text-muted-foreground text-[12px] tabular-nums">
          v2
        </span>
        <span className="rounded-full bg-[color-mix(in_oklch,var(--gold)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--gold-foreground)]">
          Rascunho
        </span>
        <span className="text-muted-foreground ml-auto text-[12px]">
          Luan Gomes · ontem, 17:40
        </span>
        <ArrowUpRight
          className="text-muted-foreground size-3.5"
          strokeWidth={2}
        />
      </button>
    </section>
  );
}

// ─── 6c. Responsáveis (aside) — REAL ─────────────────────────────────────────

/**
 * Picker de membro do escritório para um papel (condutor / revisor).
 * Reutiliza useOrgMembersDirectory (mesma fonte que o seletor de processo).
 * value="__none__" representa "A atribuir" (nenhuma seleção).
 */
function RolePicker({
  role,
  currentUserId,
  currentUserName,
  onAssign,
  isPending,
}: {
  role: string;
  currentUserId: string | null;
  currentUserName: string | null;
  onAssign: (userId: string | null) => void;
  isPending: boolean;
}) {
  const { members } = useOrgMembersDirectory();
  const value = currentUserId ?? "__none__";
  // items mapeia value→label pro <SelectValue/> do base-ui renderizar o rótulo
  // (senão o trigger mostra o valor cru, ex. "__none__").
  const items = {
    __none__: "A atribuir",
    ...Object.fromEntries(members.map((m) => [m.id, m.name])),
  };

  return (
    <li className="flex items-center gap-3">
      <Avatar initials={currentUserName ? initials(currentUserName) : "?"} />
      <div className="min-w-0 flex-1">
        <Select
          value={value}
          items={items}
          onValueChange={(v) => onAssign(v === "__none__" ? null : v)}
          disabled={isPending}
        >
          <SelectTrigger
            size="sm"
            className="text-foreground h-auto w-full justify-start border-none bg-transparent px-0 py-0 text-[13.5px] font-medium shadow-none focus-visible:ring-0"
          >
            <SelectValue placeholder="A atribuir" />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="__none__">A atribuir</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-[12px]">{role}</p>
      </div>
    </li>
  );
}

function ResponsaveisCard({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  const assign = useAssignIntimacaoResponsaveis(i.id);

  const handleAssign = (
    role: "conductor" | "reviewer",
    userId: string | null,
  ) => {
    const params =
      role === "conductor"
        ? { conductorUserId: userId, reviewerUserId: i.reviewer_user_id }
        : { conductorUserId: i.conductor_user_id, reviewerUserId: userId };
    assign.mutate(params, {
      onError: () => toast.error("Não foi possível salvar o responsável."),
    });
  };

  return (
    <div className="border-border rounded-xl border p-4">
      <EyebrowTitle>Responsáveis</EyebrowTitle>
      <ul className="mt-3 flex flex-col gap-3">
        <RolePicker
          role="condutor do prazo"
          currentUserId={i.conductor_user_id}
          currentUserName={i.conductor_user_name}
          onAssign={(uid) => handleAssign("conductor", uid)}
          isPending={assign.isPending}
        />
        <RolePicker
          role="revisão e assinatura"
          currentUserId={i.reviewer_user_id}
          currentUserName={i.reviewer_user_name}
          onAssign={(uid) => handleAssign("reviewer", uid)}
          isPending={assign.isPending}
        />
      </ul>
    </div>
  );
}

// ─── 6d. Histórico (aside) — REAL ────────────────────────────────────────────

function HistoricoCard({ intimacao: i }: { intimacao: IntimacaoDetalheView }) {
  if (i.history.length === 0) {
    return (
      <div className="border-border rounded-xl border p-4">
        <EyebrowTitle>Histórico</EyebrowTitle>
        <p className="text-muted-foreground mt-3 text-[12.5px]">
          Sem eventos ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border rounded-xl border p-4">
      <EyebrowTitle>Histórico</EyebrowTitle>
      <ul className="mt-3 flex flex-col gap-2.5">
        {i.history.map((h, idx) => (
          <li key={idx} className="flex gap-3 text-[12.5px]">
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatarDataCurta(h.occurred_at)}
            </span>
            <span className="text-foreground/80">{h.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Formata data/timestamp como "DD/MM" — a data curta do Histórico card.
 * Aceita ISO date string ou ISO timestamp; extrai dia e mês.
 */
function formatarDataCurta(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="px-8 pt-4 pb-16">
      <div className="bg-muted h-4 w-56 animate-pulse rounded" />
      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <div className="bg-muted h-3 w-40 animate-pulse rounded" />
          <div className="bg-muted mt-3 h-8 w-80 animate-pulse rounded" />
          <div className="bg-muted mt-3 h-4 w-64 animate-pulse rounded" />
        </div>
        <div className="flex gap-2.5">
          <div className="bg-muted h-9 w-32 animate-pulse rounded-lg" />
          <div className="bg-muted h-9 w-28 animate-pulse rounded-lg" />
        </div>
      </div>
      <div className="bg-muted mt-10 h-16 animate-pulse rounded" />
      <div className="bg-muted mt-8 h-28 animate-pulse rounded-xl" />
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="bg-muted h-64 animate-pulse rounded-xl" />
        <div className="bg-muted h-48 animate-pulse rounded-xl" />
      </div>
    </div>
  );
}
