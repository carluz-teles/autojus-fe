"use client";

// AnalisarCard — o card "Analisar esta intimação" (3 estados: pré-análise/loading/
// pós-análise com providências) + ProvidenciaRow. Extraído de intimacao-detail.tsx
// (Regra nº1): o master-detail (print 2 da spec) reusa EXATAMENTE o estado de
// pré-análise (mesmo componente, mesma copy aprovada — nenhuma menção a "IA") no
// painel lateral compacto, e o print 1 reusa a lista de providências pós-análise.
// Nenhuma mudança de comportamento/copy em relação ao original.

import {
  ArrowUpRight,
  Check,
  CircleDashed,
  Loader2,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarData, formatarDataHora } from "@/lib/utils";

import {
  useAnalisarIntimacao,
  useAprovarProvidencia,
  useDescartarProvidencia,
} from "../../hooks/use-intimacoes";
import type { IntimacaoDetalheView, IntimacaoProvidencia } from "../../types";
import { EyebrowTitle } from "./eyebrow-title";

/**
 * Card central de análise. Três estados:
 *  • LOADING (mutation em voo): spinner + linha de status + 3 skeletons.
 *  • PRÉ (ai_analyzed_at == null): CTA "Gerar análise".
 *  • PÓS (ai_analyzed_at != null): "O QUE ACONTECEU" (resumo) + "PROVIDÊNCIAS SUGERIDAS"
 *    (só as SUGGESTED, com responsável/vencimento sugeridos e ações Aprovar/Descartar) +
 *    rodapé de proveniência + "Gerar novamente". Resumo vazio = modo degradado (IA off).
 * O botão dispara useAnalisarIntimacao(id) → estado LOADING; erro → toast + alerta.
 */
export function AnalisarCard({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
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
      <section className="flex flex-col items-center rounded-2xl border border-dashed border-[color-mix(in_oklch,var(--gold)_30%,transparent)] bg-[color-mix(in_oklch,var(--gold)_6%,transparent)] px-6 py-9 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--gold)_16%,transparent)] text-[var(--gold-foreground)] ring-1 ring-[color-mix(in_oklch,var(--gold)_22%,transparent)]">
          <Sparkles className="size-5" strokeWidth={1.6} />
        </span>
        <h3 className="font-display text-foreground mt-4 text-[20px] leading-tight font-normal">
          Analisar esta intimação
        </h3>
        <p className="text-muted-foreground mt-2 max-w-[400px] text-[13.5px] leading-relaxed text-pretty">
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
export function AnalisarLoading() {
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
export function statusTarefa(dueDate: string | null): string {
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
export function codigoTarefa(taskId: string): string {
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
export function ProvidenciaRow({
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
                  href={`/tarefas?task=${p.task_id}`}
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
