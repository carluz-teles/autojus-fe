"use client";

// AnalisarCard — o card "Analisar esta intimação" (3 estados: pré-análise/loading/
// pós-análise com providências) + ProvidenciaRow. Extraído de intimacao-detail.tsx
// (Regra nº1): o master-detail (print 2 da spec) reusa EXATAMENTE o estado de
// pré-análise (mesmo componente, mesma copy aprovada — nenhuma menção a "IA") no
// painel lateral compacto, e o print 1 reusa a lista de providências pós-análise.
//
// Pós migração action_item (tabela real, endereçada por id — não mais jsonb por
// índice): ProvidenciaRow reage a task_id (não mais status SUGGESTED/APPROVED — ver
// docstring). Confirmar/Descartar chamam os novos endpoints /v1/action-items/:id/*;
// a criação da tarefa é 100% assíncrona no BE.
//
// Layout da seção "Providências" segue docs/design-card-providencias-v1.md (mockups
// do usuário, v1.1) — fonte de verdade visual desta revisão; onde divergir do que
// existia antes desta fatia, o doc vence.

import {
  Check,
  CircleDashed,
  Loader2,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCriarPeca } from "@/features/pecas/hooks/use-peca";
import { formatarData, formatarDataHora } from "@/lib/utils";

import {
  useAnalisarIntimacao,
  useConfirmarActionItem,
  useDescartarActionItem,
} from "../../hooks/use-intimacoes";
import type {
  IntimacaoAnaliseCandidate,
  IntimacaoDetalheView,
  IntimacaoProvidencia,
} from "../../types";
import { EyebrowTitle } from "./eyebrow-title";

/** Rótulo em PT do tipo de providência — fallback quando não há candidato efêmero da
 *  última análise em mãos (ver `candidato` em ProvidenciaRow). O BE não persiste mais
 *  título/descrição no action_item (só no candidato efêmero da análise, que se perde
 *  ao recarregar a página). */
const TIPO_LABEL: Record<string, string> = {
  contestar: "Contestar",
  recorrer: "Recorrer",
  manifestar: "Manifestar-se",
  cumprir: "Cumprir determinação",
  ciencia: "Dar-se por ciente",
};

function rotuloTipo(tipo: string): string {
  return TIPO_LABEL[tipo] ?? tipo;
}

/**
 * Card central de análise. Três estados:
 *  • LOADING (mutation em voo): spinner + linha de status + 3 skeletons.
 *  • PRÉ (ai_analyzed_at == null): CTA "Gerar análise".
 *  • PÓS (ai_analyzed_at != null): "O QUE ACONTECEU" (resumo) + seção "Providências"
 *    (tudo menos DISCARDED — ver ProvidenciaRow pros estados de cada uma) + rodapé de
 *    proveniência + "Gerar novamente". Resumo vazio = modo degradado (IA off).
 * O botão dispara useAnalisarIntimacao(id) → estado LOADING; erro → toast + alerta.
 */
export function AnalisarCard({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  const analisar = useAnalisarIntimacao(i.id);
  const confirmarTodos = useConfirmarActionItem(i.id);
  const [enviandoTodas, setEnviandoTodas] = useState(false);

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
  // Providências visíveis = tudo menos DISCARDED. Endereçadas por id (não mais por
  // índice — action_item é uma tabela real agora).
  const itens = i.ai_providencias.filter((p) => p.status !== "DISCARDED");
  const pendentes = itens.filter((p) => p.task_id == null);

  // Candidatos EFÊMEROS da última análise (título/descrição ricos que o BE não
  // persiste) — `useMutation` guarda `data` da última chamada enquanto o componente
  // não desmonta/reseta. Casados por `tipo` (não há id no candidato ainda). Se dois
  // itens da mesma análise compartilharem `tipo`, o Map fica só com o último — caso
  // raro, aceito aqui; o fallback (rotuloTipo) cobre reload de página de qualquer
  // forma (o Map fica vazio de novo).
  const candidatoPorTipo = new Map(
    (analisar.data?.providencias ?? []).map(
      (c) => [c.tipo, c] as [string, IntimacaoAnaliseCandidate],
    ),
  );

  // "Criar todas" (docs/design-card-providencias-v1.md): confirma client-side, uma
  // chamada por item ainda sem task_id — sem endpoint de bulk no BE. Idempotente
  // (reconfirmar um item que já tem tarefa é no-op seguro), então não precisa
  // recalcular `pendentes` no meio do envio.
  const onCriarTodas = async () => {
    if (pendentes.length === 0) return;
    setEnviandoTodas(true);
    try {
      await Promise.allSettled(
        pendentes.map((p) => confirmarTodos.mutateAsync(p.id)),
      );
    } finally {
      setEnviandoTodas(false);
    }
  };

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
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary size-4" strokeWidth={1.8} />
                <span className="text-foreground text-[15px] font-semibold">
                  Providências
                </span>
                <span className="text-muted-foreground text-[12px]">
                  geradas pela IA · revise antes de executar
                </span>
                <span className="text-muted-foreground ml-auto text-[12px] tabular-nums">
                  {itens.length}
                </span>
              </div>

              <div className="border-primary/20 bg-primary/5 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
                <p className="text-foreground/90 text-[13px] leading-relaxed">
                  Cada providência vira uma{" "}
                  <strong className="font-medium">tarefa</strong>, vinculada ao
                  prazo que já existe
                  {i.prazo ? ` (fatal ${formatarData(i.prazo.end_date)})` : ""}.
                  Confirme para criar a tarefa, ou descarte se não se aplica.
                </p>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={onCriarTodas}
                  disabled={pendentes.length === 0 || enviandoTodas}
                >
                  {enviandoTodas ? (
                    <Loader2
                      className="size-3.5 animate-spin"
                      strokeWidth={1.8}
                    />
                  ) : null}
                  Criar todas
                </Button>
              </div>

              <ul className="mt-2">
                {itens.map((p) => (
                  <ProvidenciaRow
                    key={p.id}
                    intimacaoId={i.id}
                    providencia={p}
                    candidato={candidatoPorTipo.get(p.tipo)}
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

/** Código curto e estável exibido na pílula de referência da tarefa (derivado do uuid).
 *  `prefix` default "TAR-" é o padrão do resto do app (ver tasks/tarefa-detail.tsx);
 *  este card usa "T-" na pílula por pedido do mockup (docs/design-card-providencias-v1.md). */
export function codigoTarefa(taskId: string, prefix = "TAR-"): string {
  return `${prefix}${taskId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/**
 * Uma providência no card de análise. Endereçada por `id` (action_item é tabela real
 * agora — não mais índice de array). Dois estados (docs/design-card-providencias-v1.md):
 *  • PRÉ (task_id == null) — botões "+ Criar tarefa" (chama confirmar; funciona igual
 *    pra item declarado ou sugerido pela IA — um único botão, um único endpoint, sempre,
 *    idempotente) e "Descartar". A distinção declarado/ia (tipo_origem/tipo_status) NÃO
 *    aparece visualmente (pedido explícito do mockup v1.1) — nem como badge, nem como
 *    texto. Simplificação deliberada: o loading só aparece durante o clique
 *    (`confirmar.isPending`), não durante a janela automática de materialização de um
 *    item já declarado (evita um estado "preso" caso o worker atrase além do poll).
 *  • PÓS (task_id != null) — pílula verde "✓ T-xxxx" (link pra tarefa) e, se
 *    `gera_peca`, o botão "⚙ Gerar minuta". Sem botões de confirmar/descartar.
 *  Erro de qualquer mutation → toast + role=alert.
 */
export function ProvidenciaRow({
  intimacaoId,
  providencia: p,
  candidato,
}: {
  intimacaoId: string;
  providencia: IntimacaoProvidencia;
  /** Candidato efêmero da ÚLTIMA análise (título/descrição ricos — ver AnalisarCard).
   *  undefined = sessão recarregada ou item de uma análise anterior → cai no rótulo
   *  genérico derivado de `tipo` (rotuloTipo). */
  candidato?: IntimacaoAnaliseCandidate;
}) {
  const confirmar = useConfirmarActionItem(intimacaoId);
  const descartar = useDescartarActionItem(intimacaoId);
  const emVoo = confirmar.isPending || descartar.isPending;
  const erro = confirmar.isError || descartar.isError;

  const onConfirmar = () =>
    confirmar.mutate(p.id, {
      onError: () =>
        toast.error("Não foi possível criar a tarefa. Tente novamente."),
    });
  const onDescartar = () =>
    descartar.mutate(p.id, {
      onError: () =>
        toast.error("Não foi possível descartar. Tente novamente."),
    });

  const comTarefa = p.task_id != null;
  const titulo = candidato?.title || rotuloTipo(p.tipo);
  const descricao = candidato?.description;

  return (
    <li className="border-border/70 flex items-start justify-between gap-4 border-t py-4 first:border-t-0 first:pt-0">
      <div className="flex min-w-0 flex-1 gap-3">
        <span
          aria-hidden
          className="text-muted-foreground/70 mt-0.5 flex shrink-0"
        >
          {comTarefa ? (
            <Square className="size-[18px]" strokeWidth={1.8} />
          ) : (
            <CircleDashed className="size-[18px]" strokeWidth={1.8} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[14px] font-medium">{titulo}</p>
          {descricao ? (
            <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
              {descricao}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {p.gera_peca ? (
              <Badge
                variant="outline"
                className="border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
              >
                Peça
              </Badge>
            ) : (
              <>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                >
                  Ciência
                </Badge>
                <Badge variant="outline" className="text-muted-foreground">
                  fluxo curto
                </Badge>
              </>
            )}
          </div>

          {erro ? (
            <p role="alert" className="text-destructive mt-2 text-[12px]">
              Não foi possível concluir a ação. Tente novamente.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        {comTarefa ? (
          <>
            {p.gera_peca ? <GerarMinutaDaTarefa providencia={p} /> : null}
            {p.task_id ? (
              <Link
                href={`/tarefas?task=${p.task_id}`}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-700 tabular-nums transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
              >
                <Check className="size-3" strokeWidth={2.4} />
                {codigoTarefa(p.task_id, "T-")}
              </Link>
            ) : null}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-[13px]"
              onClick={onConfirmar}
              disabled={emVoo}
            >
              {confirmar.isPending ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
              ) : (
                <Plus className="size-3.5" strokeWidth={2} />
              )}
              Criar tarefa
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

/**
 * Ponto de entrada TEMPORÁRIO para testar POST /v1/pecas com `task_id` (fatia 4/5 do
 * BE — a peça herda piece_profile_key/piece_type da providência). Só aparece quando a
 * providência já tem tarefa E gera peça. Sem tela dedicada ainda: cria e navega direto
 * pro draft.
 */
function GerarMinutaDaTarefa({
  providencia: p,
}: {
  providencia: IntimacaoProvidencia;
}) {
  const router = useRouter();
  const criarPeca = useCriarPeca();

  if (!p.gera_peca || !p.task_id) return null;

  const onClick = () =>
    criarPeca.mutate(
      { task_id: p.task_id! },
      {
        onSuccess: (peca) => router.push(`/pecas/${peca.id}`),
        onError: () =>
          toast.error("Não foi possível gerar a minuta. Tente novamente."),
      },
    );

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 gap-1.5 px-2.5 text-[12.5px]"
      onClick={onClick}
      disabled={criarPeca.isPending}
    >
      {criarPeca.isPending ? (
        <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} />
      ) : (
        <Settings2 className="size-3.5" strokeWidth={1.8} />
      )}
      Gerar minuta
    </Button>
  );
}
