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
import {
  useCriarPeca,
  usePecasByProcesso,
} from "@/features/pecas/hooks/use-peca";
import type { PecaListItem } from "@/features/pecas/types";
import { ConfirmarPrazo } from "@/features/prazos/components/confirmar-prazo";
import { usePartes } from "@/features/processos/hooks/use-processos";
import { cn, formatarData } from "@/lib/utils";

import {
  useAssignIntimacaoResponsavel,
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
  const criarPeca = useCriarPeca();

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
      {/* ── Header — eyebrow + título ─── ações inline à direita ── */}
      <p className="text-muted-foreground text-[10.5px] font-medium tracking-[0.14em] uppercase">
        Intimação · {i.judging_body || i.court}
      </p>
      <header className="mt-2 flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-foreground text-[32px] leading-[1.1] font-normal text-pretty">
            {tituloIntimacao(i)}
          </h1>
          <p className="text-muted-foreground mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px]">
            {i.class ? <span>{i.class} ·</span> : null}
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

        {/* Ações de peticionamento — inline com o título */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Button variant="outline" onClick={emBreve}>
            Sem providência
          </Button>
          <Button
            onClick={() => {
              criarPeca.mutate(
                {
                  source: "intimation",
                  intimation_id: i.id,
                  case_id: i.court_record_id,
                },
                {
                  onSuccess: (criada) => {
                    window.location.href = `/pecas/${criada.id}`;
                  },
                  onError: () => toast.error("Não foi possível criar a peça."),
                },
              );
            }}
            disabled={criarPeca.isPending}
          >
            {criarPeca.isPending ? "Criando…" : "Redigir peça"}
          </Button>
        </div>
      </header>

      {/* ── 3. Régua ── */}
      <hr className="border-border/70 mt-8 mb-8 border-t" />

      {/* ── 4. Barra-herói do prazo ── */}
      <PrazoHero prazo={i.prazo} courtRecordId={i.court_record_id} />

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

          {/* Peças desta intimação — REAL (peticionamento) */}
          <PecasSection courtRecordId={i.court_record_id} intimationId={i.id} />

          {/* Teor da publicação — REAL (HTML sanitizado). Guarda conteúdo vazio
               para consistência com o painel lateral compacto. */}
          {i.content ? <TeorPublicacao content={i.content} /> : null}
        </div>

        {/* Coluna lateral */}
        <aside className="flex min-w-0 flex-col gap-4">
          <ResponsavelCard intimacao={i} />
          <PartesCard intimacao={i} />
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

// ─── Helpers de status da peça (derivado da lista real) ──────────────────────

interface StatusPecaDerivado {
  label: string;
  tone: "gold" | "success" | "info" | "neutral";
  assinatura: string;
  protocolo: string;
}

function derivingStatusPeca(pecas: PecaListItem[]): StatusPecaDerivado {
  if (pecas.length === 0) {
    return {
      label: "Sem peça",
      tone: "neutral",
      assinatura: "—",
      protocolo: "—",
    };
  }

  // Pega a peça mais recente (primeira da lista — ordenada por created_at DESC).
  const latest = pecas[0];
  const status = latest.status;

  if (status === "FILED") {
    return {
      label: "Protocolada",
      tone: "success",
      assinatura: "Concluída",
      protocolo: latest.filed_at ? formatarData(latest.filed_at) : "Concluído",
    };
  }
  if (status === "SIGNED") {
    return {
      label: "Assinada",
      tone: "success",
      assinatura: "Concluída",
      protocolo: "Pendente",
    };
  }
  if (status === "DISCARDED") {
    return {
      label: "Descartada",
      tone: "neutral",
      assinatura: "—",
      protocolo: "—",
    };
  }
  // DRAFT (ou qualquer outro)
  return {
    label: "Rascunho",
    tone: "gold",
    assinatura: "Pendente",
    protocolo: "Não iniciado",
  };
}

// ─── 4. Barra-herói do prazo (REAL, derivada de i.prazo + peças) ─────────────

function PrazoHero({
  prazo,
  courtRecordId,
}: {
  prazo: IntimacaoPrazoView | null;
  courtRecordId: string;
}) {
  const { items: pecas } = usePecasByProcesso(courtRecordId);
  const statusPeca = derivingStatusPeca(pecas);

  return (
    <div className="flex flex-wrap items-start justify-between gap-8">
      <PrazoContagemGrande prazo={prazo} />

      {/* Status de peça/assinatura/protocolo — derivado das peças reais */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <StatusColuna
          label="Peça"
          value={statusPeca.label}
          tone={statusPeca.tone}
        />
        <StatusColuna label="Assinatura" value={statusPeca.assinatura} />
        <StatusColuna label="Protocolo" value={statusPeca.protocolo} />
      </div>
    </div>
  );
}

/** Uma coluna do trio de status (rótulo uppercase muted + valor). tone="gold"
 * pinta o valor em âmbar (o "Rascunho"). */
function StatusColuna({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "gold" | "success" | "info" | "neutral";
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
            : tone === "success"
              ? "font-medium text-[var(--success-foreground)]"
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

// ─── 6c. Peças desta intimação (REAL: peticionamento) ────────────────────────

function PecasSection({
  courtRecordId,
  intimationId,
}: {
  courtRecordId: string;
  intimationId: string;
}) {
  const { items: pecas, isPending } = usePecasByProcesso(courtRecordId);
  const criarPeca = useCriarPeca();

  const handleCriarPeca = () => {
    criarPeca.mutate(
      {
        source: "intimation",
        intimation_id: intimationId,
        case_id: courtRecordId,
      },
      {
        onSuccess: (criada) => {
          window.location.href = `/pecas/${criada.id}`;
        },
        onError: () => toast.error("Não foi possível criar a peça."),
      },
    );
  };

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <EyebrowTitle>Peças desta intimação</EyebrowTitle>
        <button
          type="button"
          onClick={handleCriarPeca}
          disabled={criarPeca.isPending}
          className="text-primary text-[12.5px] font-medium transition-colors hover:opacity-80 disabled:opacity-50"
        >
          {criarPeca.isPending ? "Criando…" : "+ Nova peça"}
        </button>
      </div>

      {isPending ? (
        <div className="mt-3 space-y-3">
          <div className="bg-muted h-12 animate-pulse rounded" />
          <div className="bg-muted h-12 animate-pulse rounded" />
        </div>
      ) : pecas.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-[12.5px]">
          Nenhuma peça criada para esta intimação.
        </p>
      ) : (
        pecas.map((p) => (
          <Link
            key={p.id}
            href={`/pecas/${p.id}`}
            className="border-border hover:bg-muted/40 mt-3 flex w-full items-center gap-3 border-t py-3.5 text-left transition-colors"
          >
            <span className="text-foreground text-[14px]">
              {rotuloPieceType(p.piece_type)}
            </span>
            <span className="text-foreground text-[14px]">{p.title}</span>
            <StatusBadgePeca status={p.status} />
            {p.coverage_summary?.grounded && (
              <span className="rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--success-foreground)]">
                Fundamentada
              </span>
            )}
            <span className="text-muted-foreground ml-auto text-[12px] tabular-nums">
              {formatarData(p.created_at)}
            </span>
            <ArrowUpRight
              className="text-muted-foreground size-3.5"
              strokeWidth={2}
            />
          </Link>
        ))
      )}
    </section>
  );
}

const PIECE_TYPE_LABEL: Record<string, string> = {
  DEFENSE: "Defesa",
  APPEAL: "Recurso",
  PETITION: "Petição",
  MANIFESTATION: "Manifestação",
  COUNTERCLAIM: "Reconvenção",
  BLANK: "Peça",
};

function rotuloPieceType(pieceType: string): string {
  return PIECE_TYPE_LABEL[pieceType] ?? "Peça";
}

const STATUS_PECA_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  SIGNED: "Assinada",
  FILED: "Protocolada",
  DISCARDED: "Descartada",
};

function StatusBadgePeca({ status }: { status: string }) {
  const label = STATUS_PECA_LABEL[status] ?? status;
  const isDraft = status === "DRAFT";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        isDraft
          ? "bg-[color-mix(in_oklch,var(--gold)_15%,transparent)] text-[var(--gold-foreground)]"
          : "bg-[color-mix(in_oklch,var(--success)_15%,transparent)] text-[var(--success-foreground)]",
      )}
    >
      {label}
    </span>
  );
}

// ─── 6c. Responsável (aside) — REAL, papel único (0057) ─────────────────────

function ResponsavelCard({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  const { members } = useOrgMembersDirectory();
  const assign = useAssignIntimacaoResponsavel(i.id);

  const value = i.assignee_user_id ?? "__none__";
  const currentName = i.assignee_user_name?.trim() || "";
  // items resolve value→label pro SelectValue (base-ui exige quando o value
  // sozinho não corresponde ao texto visível — ex.: "__none__" → "A atribuir").
  const items = {
    __none__: "A atribuir",
    ...Object.fromEntries(members.map((m) => [m.id, m.name])),
  };

  const onChange = (v: string | null) => {
    assign.mutate(
      { assigneeUserId: v && v !== "__none__" ? v : null },
      {
        onError: () => toast.error("Não foi possível salvar o responsável."),
      },
    );
  };

  return (
    <div className="border-border rounded-xl border p-4">
      <EyebrowTitle>Responsável</EyebrowTitle>
      <div className="mt-3 flex items-center gap-3">
        <Avatar initials={currentName ? initials(currentName) : "?"} />
        <div className="min-w-0 flex-1">
          <Select
            value={value}
            items={items}
            onValueChange={onChange}
            disabled={assign.isPending}
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
          {/* Subtítulo descritivo do papel (design). Fica sempre "condutor
              do prazo" — a distinção conductor vs reviewer foi removida na
              migration 0057, mas o rótulo humano é útil pra o advogado. */}
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            condutor do prazo
          </p>
        </div>
      </div>
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

// ─── 6d. Partes (aside) — REAL, autor/réu/procuradores ──────────────────────

// Labels processuais: dependem da classe do processo (cumprimento → EXEQUENTE/
// EXECUTADO; trabalhista → RECLAMANTE/RECLAMADO; comum/desconhecido → AUTOR/RÉU).
// Fallback conservador (AUTOR/RÉU) sempre que a classe não bater com um pattern
// conhecido — mais correto errar pelo genérico do que inventar rótulo específico.
function labelsPolo(classe: string): { autor: string; reu: string } {
  const c = (classe || "").toLowerCase();
  if (c.includes("execu") || c.includes("cumprimento")) {
    return { autor: "EXEQUENTE", reu: "EXECUTADO" };
  }
  if (c.includes("trabalh") || c.includes("reclama")) {
    return { autor: "RECLAMANTE", reu: "RECLAMADO" };
  }
  if (c.includes("mandado de seguran")) {
    return { autor: "IMPETRANTE", reu: "IMPETRADO" };
  }
  return { autor: "AUTOR", reu: "RÉU" };
}

function PartesCard({ intimacao: i }: { intimacao: IntimacaoDetalheView }) {
  const { data, isPending } = usePartes(i.court_record_id);
  const labels = labelsPolo(i.class);

  if (isPending) {
    return (
      <div className="border-border rounded-xl border p-4">
        <EyebrowTitle>Partes</EyebrowTitle>
        <div className="bg-muted mt-3 h-16 animate-pulse rounded" />
      </div>
    );
  }

  const autor = data?.autor[0];
  const reu = data?.reu[0];
  // Procuradores agregados de todos os polos (autor + réu + terceiros).
  const procuradores = [
    ...(data?.autor ?? []),
    ...(data?.reu ?? []),
    ...(data?.terceiros ?? []),
  ].flatMap((p) => p.counsels ?? []);

  // "cliente do escritório": detecta qual polo o escritório defende cruzando
  // a OAB de cada procurador com os recipients matched da intimação (OABs
  // monitoradas pelo escritório). O polo cujo procurador está na lista
  // matched é o do cliente. Vazio quando não conseguirmos inferir.
  const ourOabs = new Set(
    (i.recipients ?? [])
      .filter((r) => r.matched)
      .map((r) => `${r.oab_number}/${r.oab_uf}`),
  );
  const oabsPolo = (parts: NonNullable<typeof data>["autor"] | undefined) =>
    (parts ?? []).flatMap((p) =>
      (p.counsels ?? []).map((c) => `${c.oab}/${c.uf}`),
    );
  const autorIsClient = oabsPolo(data?.autor).some((o) => ourOabs.has(o));
  const reuIsClient =
    !autorIsClient && oabsPolo(data?.reu).some((o) => ourOabs.has(o));

  return (
    <div className="border-border flex flex-col gap-4 rounded-xl border p-4">
      <EyebrowTitle>Partes</EyebrowTitle>

      <div>
        <p className="text-muted-foreground text-[10.5px] font-medium tracking-[0.12em] uppercase">
          {labels.autor}
        </p>
        <p className="text-foreground mt-0.5 text-[13.5px]">
          {autor?.name || "Sem partes identificadas ainda."}
        </p>
        {autorIsClient ? (
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            cliente do escritório
          </p>
        ) : null}
      </div>

      <div>
        <p className="text-muted-foreground text-[10.5px] font-medium tracking-[0.12em] uppercase">
          {labels.reu}
        </p>
        <p className="text-foreground mt-0.5 text-[13.5px]">
          {reu?.name || "Sem partes identificadas ainda."}
        </p>
        {reuIsClient ? (
          <p className="text-muted-foreground mt-0.5 text-[12px]">
            cliente do escritório
          </p>
        ) : null}
      </div>

      {procuradores.length > 0 ? (
        <div>
          <p className="text-muted-foreground text-[10.5px] font-medium tracking-[0.12em] uppercase">
            Procuradores
          </p>
          <ul className="mt-0.5 flex flex-col gap-0.5 text-[13.5px]">
            {procuradores.map((c, idx) => (
              <li key={`${c.oab}-${c.uf}-${idx}`}>
                {c.name}
                {c.oab ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · OAB {c.oab}
                    {c.uf ? `/${c.uf}` : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
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
