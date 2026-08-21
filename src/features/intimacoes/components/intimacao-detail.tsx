"use client";

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDashed,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { useSetBreadcrumb } from "@/components/shell/breadcrumb-context";
import { Badge } from "@/components/ui/badge";
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
import { sanitizeContentHtml } from "@/lib/html/sanitize-content";
import { cn, formatarData, formatarDataHora } from "@/lib/utils";

import {
  useAnalisarIntimacao,
  useAprovarProvidencia,
  useAssignIntimacaoResponsaveis,
  useDescartarProvidencia,
  useIntimacaoDetalhe,
} from "../hooks/use-intimacoes";
import type {
  IntimacaoDetalheView,
  IntimacaoPrazoView,
  IntimacaoProvidencia,
} from "../types";

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
          <h1 className="font-display text-foreground mt-2 text-[32px] leading-[1.1] font-normal tabular-nums">
            {i.cnj_number}
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

/** Título de seção: uppercase tiny, tracking largo, muted — o "eyebrow" do design. */
function EyebrowTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.14em] uppercase">
      {children}
    </h2>
  );
}

/** Avatar circular com iniciais — MOCK (capacidade de papéis). */
function Avatar({ initials }: { initials: string }) {
  return (
    <span
      aria-hidden
      className="bg-muted text-foreground/70 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
    >
      {initials}
    </span>
  );
}

// ─── 4. Barra-herói do prazo (REAL, derivada de i.prazo) ─────────────────────

function PrazoHero({ prazo }: { prazo: IntimacaoPrazoView | null }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-8">
      <PrazoContagem prazo={prazo} />

      {/* Status de peça/assinatura/protocolo — MOCK: peticionamento */}
      <div className="flex flex-wrap gap-x-10 gap-y-4">
        <StatusColuna label="Peça" value="Rascunho" tone="gold" />
        <StatusColuna label="Assinatura" value="Pendente" />
        <StatusColuna label="Protocolo" value="Não iniciado" />
      </div>
    </div>
  );
}

/** O número grande + as linhas de vencimento. Derivado do prazo real (days_left,
 * end_date, status). Sem prazo → estado honesto "Sem prazo". */
function PrazoContagem({ prazo }: { prazo: IntimacaoPrazoView | null }) {
  if (!prazo) {
    return (
      <div className="flex items-center gap-3">
        <span className="font-display text-muted-foreground text-[52px] leading-none">
          —
        </span>
        <p className="text-muted-foreground text-[13px]">Sem prazo</p>
      </div>
    );
  }

  const dias = prazo.days_left;
  const atrasado = dias < 0;
  const hoje = dias === 0;

  // Cor de urgência a partir dos tokens do tema: destructive (atrasado),
  // gold (≤3 dias), foreground caso contrário.
  const cor = atrasado
    ? "text-destructive"
    : dias <= 3
      ? "text-[var(--gold-foreground)]"
      : "text-foreground";

  const magnitude = Math.abs(dias);
  const legenda = atrasado
    ? magnitude === 1
      ? "dia em atraso"
      : "dias em atraso"
    : hoje
      ? "vence hoje"
      : magnitude === 1
        ? "dia restante"
        : "dias restantes";

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "font-display text-[52px] leading-none tabular-nums",
          cor,
        )}
      >
        {hoje ? "0" : magnitude}
      </span>
      <div className="text-[13px] leading-snug">
        <p className="text-foreground font-medium">{legenda}</p>
        <p className="text-muted-foreground mt-0.5">
          Fatal em{" "}
          <span className="text-foreground font-medium tabular-nums">
            {formatarData(prazo.end_date)}
          </span>
        </p>
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

// ─── 6a. Card "Analisar esta intimação" (IA) — REAL ──────────────────────────

/**
 * Card central de análise IA. Três estados:
 *  • LOADING (mutation em voo): spinner + linha de status + 3 skeletons.
 *  • PRÉ (ai_analyzed_at == null): CTA "Gerar análise com IA".
 *  • PÓS (ai_analyzed_at != null): "O QUE ACONTECEU" (resumo) + "PROVIDÊNCIAS SUGERIDAS"
 *    (só as SUGGESTED, com responsável/vencimento sugeridos e ações Aprovar/Descartar) +
 *    rodapé de proveniência + "Gerar novamente". Resumo vazio = modo degradado (IA off).
 * O botão dispara useAnalisarIntimacao(id) → estado LOADING; erro → toast + alerta.
 */
function AnalisarCard({ intimacao: i }: { intimacao: IntimacaoDetalheView }) {
  const analisar = useAnalisarIntimacao(i.id);
  const gerar = () =>
    analisar.mutate(undefined, {
      onError: () =>
        toast.error("Não foi possível gerar a análise. Tente novamente."),
    });

  // LOADING: enquanto a análise (re)gera — card bordado com skeleton (independe de pré/pós).
  if (analisar.isPending) return <AnalisarLoading />;

  // Pré-análise: nunca analisada ainda → CTA centrado.
  if (!i.ai_analyzed_at) {
    return (
      <section className="border-border flex flex-col items-center rounded-xl border px-6 py-10 text-center">
        <span className="bg-muted text-foreground/70 flex size-9 items-center justify-center rounded-lg">
          <Sparkles className="size-4" strokeWidth={1.8} />
        </span>
        <h3 className="font-display text-foreground mt-4 text-[20px] leading-tight font-normal">
          Analisar esta intimação
        </h3>
        <p className="text-muted-foreground mt-2 max-w-[440px] text-[14px] leading-relaxed">
          Leitura do teor da publicação para gerar o resumo do que aconteceu e
          as providências a cumprir. Você revisa antes de tudo virar tarefa.
        </p>
        {analisar.isError ? (
          <p role="alert" className="text-destructive mt-4 text-[13px]">
            Não foi possível gerar a análise. Tente novamente.
          </p>
        ) : null}
        <Button className="mt-5 gap-1.5" onClick={gerar}>
          <Sparkles className="size-4" strokeWidth={1.8} />
          Gerar análise
        </Button>
      </section>
    );
  }

  // Pós-análise. Modo degradado = analisada mas summary vazio (IA não configurada).
  const degradado = !i.ai_summary?.trim();
  // Providências visíveis = tudo menos DISCARDED, preservando o índice original (as ações
  // do BE endereçam a providência por índice no array). SUGGESTED trazem os botões; APPROVED
  // permanecem no card com a referência da tarefa criada (não somem ao aprovar).
  const itens = i.ai_providencias
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.status !== "DISCARDED");
  const nSugeridas = itens.filter(({ p }) => p.status === "SUGGESTED").length;
  const nAprovadas = itens.filter(({ p }) => p.status === "APPROVED").length;
  const contagem = [
    nSugeridas > 0
      ? `${nSugeridas} ${nSugeridas === 1 ? "sugerida a revisar" : "sugeridas a revisar"}`
      : null,
    nAprovadas > 0
      ? `${nAprovadas} ${nAprovadas === 1 ? "aprovada" : "aprovadas"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="border-border rounded-xl border px-6 py-6">
      {degradado ? (
        <p
          role="alert"
          className="text-muted-foreground text-[14px] leading-relaxed"
        >
          Análise indisponível no momento. Tente novamente.
        </p>
      ) : (
        <>
          <EyebrowTitle>O que aconteceu</EyebrowTitle>
          <p className="text-foreground/90 mt-2.5 text-[14px] leading-relaxed">
            {i.ai_summary}
          </p>

          {itens.length > 0 ? (
            <div className="mt-7">
              <div className="flex items-baseline justify-between gap-3">
                <EyebrowTitle>Providências sugeridas</EyebrowTitle>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {contagem}
                </span>
              </div>
              <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
                Nada vira tarefa até você aprovar e atribuir.
              </p>

              <ul className="mt-4">
                {itens.map(({ p, idx }) => (
                  <ProvidenciaRow
                    key={`${p.title}-${idx}`}
                    intimacaoId={i.id}
                    providencia={p}
                    idx={idx}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="border-border/70 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <p className="text-muted-foreground text-[12px]">
          Gerado em {formatarDataHora(i.ai_analyzed_at)} · revise antes de dar
          andamento
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={gerar}
        >
          <RotateCcw className="size-3.5" strokeWidth={1.8} />
          Gerar novamente
        </Button>
      </div>
    </section>
  );
}

/** Estado LOADING do card de análise: status + 3 barras de skeleton. */
function AnalisarLoading() {
  return (
    <section
      className="border-border rounded-xl border px-6 py-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <Loader2
          className="text-primary mt-0.5 size-6 shrink-0 animate-spin"
          strokeWidth={1.8}
        />
        <div className="min-w-0">
          <p className="text-foreground text-[15px] font-medium">
            Analisando o teor da publicação…
          </p>
          <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">
            Lendo o processo, identificando o prazo e derivando as providências.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2.5">
        <span className="bg-muted h-3 w-full animate-pulse rounded" />
        <span className="bg-muted h-3 w-[85%] animate-pulse rounded" />
        <span className="bg-muted h-3 w-[60%] animate-pulse rounded" />
      </div>
    </section>
  );
}

/** Rótulo do status da tarefa derivado do vencimento (mesma linguagem da tela de Tarefas). */
function statusTarefa(dueDate: string | null): string {
  if (!dueDate) return "Sem prazo";
  const [y, m, d] = dueDate.split("-").map(Number);
  if (!y || !m || !d) return "Sem prazo";
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(y, m - 1, d);
  if (venc < hoje) return "Atrasada";
  if (venc.getTime() === hoje.getTime()) return "Vence hoje";
  return "No prazo";
}

/** Código curto e estável exibido na pílula de referência da tarefa (derivado do uuid). */
function codigoTarefa(taskId: string): string {
  return `TAR-${taskId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * Uma providência no card de análise. Dois estados:
 *  • APPROVED — permanece no card (não some ao aprovar): checkbox de tarefa + título +
 *    descrição + pílula de status ("Atrasada"…) + referência "TAR-xxxx ↗" (link p/ a tarefa
 *    real) + "tarefa de {responsável}". Sem botões.
 *  • SUGGESTED — círculo tracejado + pílula "Sugerida" (âmbar) + "IA sugere: {resp} · vence
 *    {data}" + ações Aprovar (cria tarefa real + marca APPROVED) / Descartar (marca DISCARDED),
 *    ambas desabilitadas enquanto qualquer mutation está em voo. Erro → toast + role=alert.
 */
function ProvidenciaRow({
  intimacaoId,
  providencia: p,
  idx,
}: {
  intimacaoId: string;
  providencia: IntimacaoProvidencia;
  idx: number;
}) {
  const aprovar = useAprovarProvidencia(intimacaoId);
  const descartar = useDescartarProvidencia(intimacaoId);
  const emVoo = aprovar.isPending || descartar.isPending;
  const erro = aprovar.isError || descartar.isError;

  const onAprovar = () =>
    aprovar.mutate(
      { idx, providencia: p },
      {
        onSuccess: () => toast.success("Providência aprovada e atribuída."),
        onError: () =>
          toast.error("Não foi possível aprovar. Tente novamente."),
      },
    );
  const onDescartar = () =>
    descartar.mutate(idx, {
      onError: () =>
        toast.error("Não foi possível descartar. Tente novamente."),
    });

  const aprovada = p.status === "APPROVED";

  return (
    <li className="border-border/70 flex gap-3 border-t py-4 first:border-t-0 first:pt-0">
      <span
        aria-hidden
        className="text-muted-foreground/70 mt-0.5 flex shrink-0"
      >
        {aprovada ? (
          <Square className="size-[18px]" strokeWidth={1.8} />
        ) : (
          <CircleDashed className="size-[18px]" strokeWidth={1.8} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-[14px] font-medium">{p.title}</p>
        {p.description ? (
          <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
            {p.description}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {aprovada ? (
            <>
              <Badge variant="outline" className="text-muted-foreground">
                {statusTarefa(p.due_date)}
              </Badge>
              {p.task_id ? (
                <Link
                  href={`/tarefas/${p.task_id}`}
                  className="border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[12px] tabular-nums transition-colors"
                >
                  {codigoTarefa(p.task_id)}
                  <ArrowUpRight className="size-3" strokeWidth={1.8} />
                </Link>
              ) : null}
              {p.suggested_assignee_name ? (
                <span className="text-muted-foreground text-[12px]">
                  tarefa de {p.suggested_assignee_name}
                </span>
              ) : null}
            </>
          ) : (
            <>
              <Badge
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                Sugerida
              </Badge>
              {p.due_date ? (
                <span className="text-muted-foreground text-[12px]">
                  vence {formatarData(p.due_date)}
                </span>
              ) : null}
            </>
          )}
        </div>

        {erro ? (
          <p role="alert" className="text-destructive mt-2 text-[12px]">
            Não foi possível concluir a ação. Tente novamente.
          </p>
        ) : null}

        {aprovada ? null : (
          <div className="mt-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/70 text-primary hover:bg-primary/5 hover:text-primary h-8 gap-1.5 bg-transparent px-3 text-[13px]"
              onClick={onAprovar}
              disabled={emVoo}
            >
              {aprovar.isPending ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
              ) : (
                <Check className="size-3.5" strokeWidth={2} />
              )}
              Aprovar e atribuir
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground h-8 px-2 text-[13px]"
              onClick={onDescartar}
              disabled={emVoo}
            >
              Descartar
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── 6b. Teor da publicação — REAL (HTML sanitizado) ─────────────────────────

/** Altura fechada do teor colapsado (px) — ~8 linhas de leitura antes do fade. */
const TEOR_COLLAPSED_HEIGHT = 260;

/**
 * Teor da publicação com colapso: publicações longas (comuns no DJEN) ficam limitadas a
 * `TEOR_COLLAPSED_HEIGHT` com fade no rodapé + "Ver mais". Mede a altura real do conteúdo
 * (via ref, após o HTML sanitizado montar) para só mostrar o botão quando o teor de fato
 * excede o limite — publicações curtas não ganham controle nenhum.
 */
function TeorPublicacao({ content }: { content: string }) {
  const [expandido, setExpandido] = useState(false);
  const [transborda, setTransborda] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) setTransborda(el.scrollHeight > TEOR_COLLAPSED_HEIGHT);
  }, [content]);

  return (
    <section className="mt-10">
      <EyebrowTitle>Teor da publicação</EyebrowTitle>
      <div
        ref={contentRef}
        style={
          !expandido && transborda
            ? {
                maxHeight: TEOR_COLLAPSED_HEIGHT,
                overflow: "hidden",
                // Mascara o próprio conteúdo (não uma cor sólida sobreposta): o texto
                // desvanece revelando o fundo real por trás — a página tem um gradiente
                // atmosférico no body (globals.css), então um overlay bg-background sólido
                // destoa. maskImage funciona pra qualquer fundo, sem hardcode de cor.
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 70%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 70%, transparent 100%)",
              }
            : undefined
        }
        className="prose-intimacao border-border text-foreground/90 mt-3 border-l-2 pl-4 text-[14px] leading-relaxed"
        // sanitizeContentHtml remove scripts/handlers/URIs perigosas (DJEN externo).
        dangerouslySetInnerHTML={{ __html: sanitizeContentHtml(content) }}
      />
      {transborda ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground mt-2 gap-1.5 pl-4"
          onClick={() => setExpandido((v) => !v)}
        >
          {expandido ? "Ver menos" : "Ver mais"}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expandido && "rotate-180",
            )}
            strokeWidth={1.8}
          />
        </Button>
      ) : null}
    </section>
  );
}

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

/** Extrai as iniciais de um nome completo (até 2 letras). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
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
