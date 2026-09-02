"use client";

// AnalisarCard — o card "Analisar esta intimação" (3 estados: pré-análise/loading/
// pós-análise com providências) + ProvidenciaRow. Extraído de intimacao-detail.tsx
// (Regra nº1): o master-detail (print 2 da spec) reusa EXATAMENTE o estado de
// pré-análise (mesmo componente, mesma copy aprovada — nenhuma menção a "IA") no
// painel lateral compacto, e o print 1 reusa a lista de providências pós-análise.
//
// Pós migração action_item (tabela real, endereçada por id — não mais jsonb por
// índice): ProvidenciaRow reage a task_id (não mais status SUGGESTED/APPROVED — ver
// docstring). Confirmar chama o novo endpoint /v1/action-items/:id/confirmar; a
// criação da tarefa é 100% assíncrona no BE.
//
// Layout da seção "Providências" segue docs/design-card-providencias-v2.md (v2.1) —
// fonte de verdade LITERAL (extraída do .dc.html canônico), substitui INTEIRAMENTE a
// v1. `ProvidenciasLinhaLegal`, `ProvidenciasBanner` e `ComoIALeuCard` são exportados
// porque também são consumidos por IntimacaoDetalhe (features/prazos) — o card
// "Providências" de lá tem seu próprio header (não reusa <AnalisarCard/> inteiro),
// mas usa os MESMOS blocos internos, pra não duplicar a heurística de
// selo/confiança em dois lugares (Regra nº1).
//
// v2.1 (correção do usuário): a trilha "1·Ato / 2·Prazo / 3·Providências" foi
// removida por decisão explícita, mesmo estando no .dc.html original —
// `ProvidenciasLinhaLegal` (ex-`ProvidenciasBreadcrumb`) hoje só renderiza a linha
// de detalhe legal. E "Como a IA leu" deixou de ser um card novo separado do card
// "Análise" — é o MESMO card (ver `ComoIALeuCard`, corpo = `ai_summary` real).
//
// Mapeamento de tokens do mock pro nosso design system: onde o .dc.html usa
// `var(--accent)` para ênfase (ícone, "Criar todas", borda do "Gerar minuta", label
// "Como a IA leu"), usamos `var(--primary)`/`text-primary`/`bg-primary` — no NOSSO
// globals.css o slot shadcn `--accent` foi mantido neutro (cinza) e é `--primary`
// quem recebeu o teal vibrante do mockup na migração da casca (ver comentário em
// src/app/globals.css). `var(--gold)`/`var(--green)` batem 1:1 com o mock.

import { Check, Loader2, Plus, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCriarPeca } from "@/features/pecas/hooks/use-peca";
import { formatarData, formatarDataHora } from "@/lib/utils";

import {
  useAnalisarIntimacao,
  useConfirmarActionItem,
} from "../../hooks/use-intimacoes";
import type { IntimacaoDetalheView, IntimacaoProvidencia } from "../../types";
import { EyebrowTitle } from "./eyebrow-title";

/** Rótulo em PT do tipo de providência — fallback quando o action_item não tem
 *  `title` persistido (itens anteriores à migração 0090, ou análise degradada). */
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
 * Heurística de confiança da classificação do ato — usada tanto na cor da
 * pílula "1 · Ato" do breadcrumb quanto no rótulo `{{ atoConf }}` do card "Como
 * a IA leu" (docs/design-card-providencias-v2.md §2 e §6: a doc pede a MESMA
 * derivação nos dois pontos). Cobre só os 2 casos reais do pipeline hoje:
 *  • ALGUM action_item com tipo_origem="ia" → "IA · confiança {média}%" (média
 *    das `confianca` desses itens, arredondada) — cor var(--primary).
 *  • senão (100% declarado, ou reclassificado manualmente sem nenhum item de
 *    origem IA sobrando) → "Declarado na intimação" — cor var(--green).
 * O terceiro caso do mock ("Divergente · revisar") é conceito do Motor de
 * Prazos pro PRAZO, não pro Ato, e não existe neste ponto do pipeline — omitido
 * de propósito (ver v2 §6), não é um esquecimento.
 */
function atoConfianca(itens: IntimacaoProvidencia[]): {
  label: string;
  cor: string;
} {
  const iaItens = itens.filter((p) => p.tipo_origem === "ia");
  if (iaItens.length > 0) {
    const confiancas = iaItens
      .map((p) => p.confianca)
      .filter((c): c is number => c != null);
    const media =
      confiancas.length > 0
        ? Math.round(
            (confiancas.reduce((soma, c) => soma + c, 0) / confiancas.length) *
              100,
          )
        : 0;
    return { label: `IA · confiança ${media}%`, cor: "var(--primary)" };
  }
  return { label: "Declarado na intimação", cor: "var(--green)" };
}

/**
 * Selo/nasce do BANNER (§3 do v2) — agregado do LOTE, pior caso: se QUALQUER
 * item visível ainda for `tipo_status="a_confirmar"`, o banner inteiro mostra
 * "A apurar"/"triagem — confirme o tipo primeiro"; só quando TODOS já forem
 * "confiavel" o banner mostra "Confiável"/"A fazer". O mock tinha um selo único
 * por lote; nosso modelo tem `tipo_status` POR item (mais rico — ver
 * `seloItemInfo`, usado na linha de cada providência). Isto é uma extensão
 * razoável do mock pro nosso modelo, documentada aqui por pedido explícito do
 * v2 (não é invenção arbitrária).
 */
function bannerSeloNasce(itens: IntimacaoProvidencia[]): {
  selo: string;
  nasce: string;
} {
  const algumAConfirmar = itens.some((p) => p.tipo_status === "a_confirmar");
  return algumAConfirmar
    ? { selo: "A apurar", nasce: "triagem — confirme o tipo primeiro" }
    : { selo: "Confiável", nasce: "A fazer" };
}

/** Selo POR ITEM (§4 do v2) — mapeia direto de `tipo_status`, sem agregação. */
function seloItemInfo(status: IntimacaoProvidencia["tipo_status"]): {
  label: string;
  cor: string;
} {
  return status === "a_confirmar"
    ? { label: "A apurar", cor: "var(--gold)" }
    : { label: "Confiável", cor: "var(--green)" };
}

/** Badge pequeno com cor dinâmica (± dot) — usado pelos badges de tipo/selo da
 *  linha de providência. `dot`=true desenha o marcador redondo à esquerda do
 *  texto (o selo por item, §4 do v2); os demais (Peça/Ciência/fluxo curto) não
 *  têm dot. */
function RowBadge({
  children,
  cor,
  fundo,
  dot,
}: {
  children: ReactNode;
  cor: string;
  fundo: string;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-medium"
      style={{ color: cor, background: fundo }}
    >
      {dot ? (
        <span
          aria-hidden
          className="size-[5px] shrink-0 rounded-full"
          style={{ background: cor }}
        />
      ) : null}
      {children}
    </span>
  );
}

/**
 * Linha de detalhe legal, no topo do bloco Providências
 * (docs/design-card-providencias-v2.md §2, v2.1). A trilha "1·Ato / 2·Prazo /
 * 3·Providências" do `.dc.html` original foi removida por decisão explícita do
 * usuário — NÃO renderizar, mesmo estando no mock. Só a linha de detalhe
 * sobrevive, e é best-effort: cita só a publicação real (DJEN); NÃO inventamos
 * artigo de lei/regra de contagem (o mock hardcoda "art. 219, CPC" por regex,
 * que não é dado real). Sem `published_at`, omite o bloco inteiro (nunca uma
 * linha vazia/"—").
 */
export function ProvidenciasLinhaLegal({
  intimacao: i,
}: {
  intimacao: IntimacaoDetalheView;
}) {
  if (!i.published_at) return null;

  return (
    <div className="border-line2 border-b px-4 py-3">
      <p className="text-fg3 text-[11px]">
        Publicação no DJEN em {formatarData(i.published_at)}
      </p>
    </div>
  );
}

/**
 * Banner "Cada providência vira uma tarefa…" (docs/design-card-providencias-v2.md
 * §3 — texto completo). Sem prazo vinculado, a frase perde a cláusula do
 * prazo/selo (não mostramos "fatal —"). Ver `bannerSeloNasce` pro selo/nasce
 * agregado do lote. SEM CTA "Criar todas" — removido por decisão explícita do
 * usuário (v2.1): criar tarefa é sempre uma decisão por item, nunca em lote.
 */
export function ProvidenciasBanner({
  intimacao: i,
  itens,
}: {
  intimacao: IntimacaoDetalheView;
  itens: IntimacaoProvidencia[];
}) {
  const { selo, nasce } = bannerSeloNasce(itens);
  const fatalDate = i.prazo ? formatarData(i.prazo.end_date) : null;

  return (
    <div className="bg-bg border-line2 border-b px-4 py-2.5">
      <p className="text-fg2 text-[13px] leading-relaxed">
        {fatalDate ? (
          <>
            Cada providência vira uma{" "}
            <strong className="font-medium">tarefa</strong>, vinculada ao prazo
            que já existe (fatal {fatalDate}) e herdando o selo{" "}
            <strong className="font-medium">{selo}</strong> — nasce em{" "}
            <strong className="font-medium">{nasce}</strong>.
          </>
        ) : (
          <>
            Cada providência vira uma{" "}
            <strong className="font-medium">tarefa</strong> — confirme antes de
            criar.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Card "Como a IA leu" (coluna secundária, docs/design-card-providencias-v2.md
 * §6, v2.1 — correção do usuário). Este é o MESMO card "Análise" que já
 * existia (mostrava só `ai_summary`) — não um card novo separado: aqui ele
 * ganha o visual accent/primary do `.dc.html` (label "COMO A IA LEU" + ato em
 * serif + confiança à direita) por cima do corpo real. O corpo é o
 * `ai_summary` de verdade (prop `resumo`) — NÃO o texto fixo genérico do mock
 * ("A IA leu o teor, classificou..."), que era só placeholder de protótipo.
 * Some quando ainda não há providências (nada pra resumir). Ver
 * `atoConfianca` pra heurística de confiança (documentada lá).
 */
export function ComoIALeuCard({
  ato,
  resumo,
  itens,
}: {
  ato: string;
  resumo: string;
  itens: IntimacaoProvidencia[];
}) {
  if (itens.length === 0) return null;
  const conf = atoConfianca(itens);

  return (
    <div
      className="rounded-xl border px-4 py-3.5"
      style={{
        borderColor: "color-mix(in oklch, var(--primary) 26%, transparent)",
        background: "color-mix(in oklch, var(--primary) 5%, transparent)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-primary text-[11px] font-semibold tracking-[0.03em] uppercase">
          Como a IA leu
        </span>
        <span className="text-fg3 ml-auto font-mono text-[10.5px]">
          {conf.label}
        </span>
      </div>
      <p className="font-display mt-2 mb-1 text-[16px]">{ato || "—"}</p>
      <p className="text-fg2 text-[11.5px] leading-relaxed">{resumo}</p>
    </div>
  );
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
            <div className="border-line bg-panel mt-7 overflow-hidden rounded-xl border">
              <div className="border-line2 flex items-center gap-2 border-b px-4 pt-3.5 pb-3">
                <Sparkles className="text-primary size-4" strokeWidth={1.8} />
                <span className="text-foreground text-[13px] font-semibold">
                  Providências
                </span>
                <span className="text-fg3 text-[11.5px]">
                  geradas pela IA · revise antes de executar
                </span>
                <span className="text-fg3 ml-auto font-mono text-[11px]">
                  {itens.length}
                </span>
              </div>

              <ProvidenciasLinhaLegal intimacao={i} />
              <ProvidenciasBanner intimacao={i} itens={itens} />

              <ul>
                {itens.map((p) => (
                  <ProvidenciaRow
                    key={p.id}
                    intimacaoId={i.id}
                    providencia={p}
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
 *  este card usa "T-" na pílula por pedido do mockup (docs/design-card-providencias-v2.md). */
export function codigoTarefa(taskId: string, prefix = "TAR-"): string {
  return `${prefix}${taskId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Botão de ação da linha de providência — "Criar tarefa" e "Gerar minuta" são o
 *  MESMO botão (mesmo tamanho/forma), diferindo APENAS na cor (aplicada via `style`
 *  inline no ponto de uso). Padding 7px 12px / radius 7px / 12px / ícone 13px. */
const ACAO_BTN_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 rounded-[7px] border px-3 py-[7px] text-[12px] font-medium transition-[filter] hover:brightness-95 disabled:opacity-60";

/**
 * Uma providência no card de análise. Endereçada por `id` (action_item é tabela real
 * agora — não mais índice de array). Dois estados (docs/design-card-providencias-v2.md §4):
 *  • PRÉ (task_id == null) — botão "+ Criar tarefa" (chama confirmar; funciona igual
 *    pra item declarado ou sugerido pela IA — um único botão, um único endpoint, sempre,
 *    idempotente). SEM botão de Descartar — o .dc.html não tem essa ação nesta view
 *    (useDescartarActionItem continua existindo no hook layer, só não é usado aqui).
 *  • PÓS (task_id != null) — pílula verde "✓ T-xxxx" (link pra tarefa) e, se
 *    `gera_peca`, o botão "Gerar minuta"; senão (Ciência), texto simples "no fluxo".
 *  Erro de confirmar → toast + role=alert.
 */
export function ProvidenciaRow({
  intimacaoId,
  providencia: p,
}: {
  intimacaoId: string;
  providencia: IntimacaoProvidencia;
}) {
  const confirmar = useConfirmarActionItem(intimacaoId);
  const emVoo = confirmar.isPending;
  const erro = confirmar.isError;

  const onConfirmar = () =>
    confirmar.mutate(p.id, {
      onError: () =>
        toast.error("Não foi possível criar a tarefa. Tente novamente."),
    });

  const comTarefa = p.task_id != null;
  // Título/descrição vêm PERSISTIDOS do action_item (read model, migração 0090) —
  // não mais de cache efêmero por tipo. Fallback ao rótulo genérico quando o item é
  // antigo (title null) ou a análise degradou.
  const titulo = p.title || rotuloTipo(p.tipo);
  const descricao = p.description;
  const selo = seloItemInfo(p.tipo_status);

  return (
    // Grid 1fr auto — fiel ao .dc.html (Prazos-Linear, bloco <sc-for as="pv">):
    // padding 12px 16px, gap 12px, border-bottom var(--line2), row-hover.
    <li className="border-line2 hover:bg-hover grid grid-cols-[1fr_auto] items-center gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <span className="text-foreground block text-[13px] font-medium">
          {titulo}
        </span>
        {descricao ? (
          <span className="text-fg3 mt-[3px] block text-[11.5px] leading-[1.45]">
            {descricao}
          </span>
        ) : null}

        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* tipo (Peça=gold / Ciência=cinza) — badge 9.5px do design */}
          {p.gera_peca ? (
            <RowBadge
              cor="var(--gold)"
              fundo="color-mix(in oklch, var(--gold) 12%, transparent)"
            >
              Peça
            </RowBadge>
          ) : (
            <RowBadge cor="var(--fg3)" fundo="var(--hover)">
              Ciência
            </RowBadge>
          )}
          {!p.gera_peca ? (
            <RowBadge cor="var(--fg3)" fundo="var(--hover)">
              fluxo curto
            </RowBadge>
          ) : null}
          <RowBadge
            cor={selo.cor}
            fundo={`color-mix(in oklch, ${selo.cor} 12%, transparent)`}
            dot
          >
            {selo.label}
          </RowBadge>
          {/* Chip da tarefa — fiel ao design: borda green 38% / fundo green 9% /
              mono 9.5px + check, dentro do cluster de badges. Clicável (leva à
              tarefa) — o único desvio do mock estático (§4 do v2). */}
          {p.task_id ? (
            <Link
              href={`/tarefas?task=${p.task_id}`}
              className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-medium tabular-nums transition-[filter] hover:brightness-95"
              style={{
                borderColor:
                  "color-mix(in oklch, var(--green) 38%, transparent)",
                background: "color-mix(in oklch, var(--green) 9%, transparent)",
                color: "var(--green)",
              }}
            >
              <Check className="size-[11px]" strokeWidth={2.4} />
              {codigoTarefa(p.task_id, "T-")}
            </Link>
          ) : null}
        </span>

        {erro ? (
          <span
            role="alert"
            className="text-destructive mt-2 block text-[12px]"
          >
            Não foi possível concluir a ação. Tente novamente.
          </span>
        ) : null}
      </div>

      {/* Coluna de ação (auto) */}
      {comTarefa ? (
        <span className="inline-flex items-center gap-2">
          {p.gera_peca ? (
            <GerarMinutaDaTarefa providencia={p} />
          ) : (
            <span className="text-fg3 text-[11.5px]">no fluxo</span>
          )}
        </span>
      ) : (
        // "Criar tarefa" — MESMO botão/tamanho do "Gerar minuta" (ACAO_BTN_CLASS),
        // só muda a COR: outline NEUTRO (border --line / bg --panel / texto --fg).
        <button
          type="button"
          onClick={onConfirmar}
          disabled={emVoo}
          className={ACAO_BTN_CLASS}
          style={{
            borderColor: "var(--line)",
            background: "var(--panel)",
            color: "var(--foreground)",
          }}
        >
          {emVoo ? (
            <Loader2 className="size-[13px] animate-spin" strokeWidth={2.2} />
          ) : (
            <Plus className="size-[13px]" strokeWidth={2.2} />
          )}
          Criar tarefa
        </button>
      )}
    </li>
  );
}

/**
 * Ponto de entrada TEMPORÁRIO para testar POST /v1/pecas com `task_id` (fatia 4/5 do
 * BE — a peça herda piece_profile_key/piece_type da providência). Só aparece quando a
 * providência já tem tarefa E gera peça (docs/design-card-providencias-v2.md §5 — a
 * ação mora só aqui, NÃO existe mais um card "Minuta" separado). Sem tela dedicada
 * ainda: cria e navega direto pro draft (idempotente por task_id no BE).
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
    // MESMO botão/tamanho do "Criar tarefa" (ACAO_BTN_CLASS); só muda a COR:
    // accent (borda primary 45% / fundo primary 7% / texto primary).
    <button
      type="button"
      onClick={onClick}
      disabled={criarPeca.isPending}
      className={ACAO_BTN_CLASS}
      style={{
        borderColor: "color-mix(in oklch, var(--primary) 45%, transparent)",
        background: "color-mix(in oklch, var(--primary) 7%, transparent)",
        color: "var(--primary)",
      }}
    >
      {criarPeca.isPending ? (
        <Loader2 className="size-[13px] animate-spin" strokeWidth={1.9} />
      ) : (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3m12 0h3M18.4 5.6l-2.1 2.1M12 18v3M7.7 16.3l-2.1 2.1m12.8 0-2.1-2.1" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      )}
      Gerar minuta
    </button>
  );
}
